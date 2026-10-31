import cassandra from 'cassandra-driver';
import config from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ensureCassandraSchema } from './cassandra-schema.js';

const { Client, auth } = cassandra;

let appClient = null;
let connectingPromise = null;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// The driver has no client.prepare() helper in v4. Passing prepare:true lets it
// prepare and cache each statement per host, which also protects user values
// from being interpolated into CQL strings.
const cql = Object.freeze({
  insertOrderEvent: `INSERT INTO order_events_by_order
    (order_id, event_timestamp, event_id, customer_id, event_type, previous_status, new_status, description, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  insertCustomerActivity: `INSERT INTO customer_order_activity_by_customer
    (customer_id, activity_timestamp, event_id, order_id, order_number, event_type, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  selectOrderEvents: `SELECT order_id, event_timestamp, event_id, customer_id, event_type, previous_status,
      new_status, description, metadata
    FROM order_events_by_order WHERE order_id = ?`,
  selectCustomerActivity: `SELECT customer_id, activity_timestamp, event_id, order_id, order_number,
      event_type, status, description
    FROM customer_order_activity_by_customer WHERE customer_id = ?`,
  ping: 'SELECT release_version FROM system.local',
});

function createClient({ withKeyspace = true } = {}) {
  const options = {
    contactPoints: config.cassandraContactPoints,
    localDataCenter: config.CASSANDRA_LOCAL_DATACENTER,
    protocolOptions: { port: config.CASSANDRA_PORT },
    socketOptions: {
      connectTimeout: 5000,
      readTimeout: 12000,
    },
    queryOptions: {
      consistency: cassandra.types.consistencies.localOne,
    },
  };

  if (config.CASSANDRA_USERNAME) {
    options.authProvider = new auth.PlainTextAuthProvider(
      config.CASSANDRA_USERNAME,
      config.CASSANDRA_PASSWORD,
    );
  }

  if (withKeyspace) options.keyspace = config.CASSANDRA_KEYSPACE;
  return new Client(options);
}

function isConnected(client) {
  return Boolean(client && client.getState && client.getState().getConnectedHosts().length > 0);
}

async function internalConnect({ retries, baseDelayMs }) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    let adminClient;
    try {
      // The temporary client has no keyspace so it can create one on first run.
      adminClient = createClient({ withKeyspace: false });
      await adminClient.connect();
      await ensureCassandraSchema(adminClient, config.CASSANDRA_KEYSPACE);
      await adminClient.shutdown();
      adminClient = null;

      const client = createClient();
      await client.connect();
      await client.execute(cql.ping, [], { prepare: false });
      appClient = client;
      logger.info('Cassandra connected', {
        keyspace: config.CASSANDRA_KEYSPACE,
        datacenter: config.CASSANDRA_LOCAL_DATACENTER,
      });
      return appClient;
    } catch (error) {
      lastError = error;
      if (adminClient) {
        await adminClient.shutdown().catch(() => {});
      }
      if (attempt === retries) break;
      const delay = Math.min(baseDelayMs * attempt, 8000);
      logger.warn('Cassandra not ready; retrying', {
        attempt,
        retryInMs: delay,
        reason: error.message,
      });
      await sleep(delay);
    }
  }

  logger.error('Cassandra connection failed after retries', { error: lastError?.message });
  throw lastError;
}

/**
 * Initializes the keyspace/tables and opens a keyspace-scoped client. Concurrent
 * callers share the same attempt so startup and workers cannot create duplicate
 * clients.
 */
export async function connectCassandra({ retries = 10, baseDelayMs = 1000 } = {}) {
  if (isConnected(appClient)) return appClient;
  if (connectingPromise) return connectingPromise;

  connectingPromise = internalConnect({ retries, baseDelayMs })
    .catch((error) => {
      appClient = null;
      throw error;
    })
    .finally(() => {
      connectingPromise = null;
    });

  return connectingPromise;
}

async function ensureClient() {
  if (!isConnected(appClient)) {
    await connectCassandra({ retries: 3, baseDelayMs: 500 });
  }
  return appClient;
}

export async function cassandraIsReady() {
  try {
    const client = await ensureClient();
    await client.execute(cql.ping, [], { prepare: false });
    return true;
  } catch {
    return false;
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toOrderEvent(row) {
  return {
    eventId: row.event_id.toString(),
    timestamp: row.event_timestamp.toISOString(),
    customerId: row.customer_id,
    eventType: row.event_type,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    description: row.description,
    metadata: row.metadata ? safeJsonParse(row.metadata) : null,
  };
}

/**
 * Writes both Cassandra access patterns using the stable event ID and timestamp.
 * INSERT with the same primary key is an upsert, so retries are idempotent and
 * never create duplicate logical events.
 */
export async function writeOrderEvent(event) {
  const client = await ensureClient();
  const eventId = cassandra.types.Uuid.fromString(event.eventId);
  const timestamp = new Date(event.timestamp);
  const metadata = event.metadata ? JSON.stringify(event.metadata) : null;

  await Promise.all([
    client.execute(
      cql.insertOrderEvent,
      [
        String(event.orderId),
        timestamp,
        eventId,
        String(event.customerId),
        event.eventType,
        event.previousStatus,
        event.newStatus,
        event.description,
        metadata,
      ],
      { prepare: true },
    ),
    client.execute(
      cql.insertCustomerActivity,
      [
        String(event.customerId),
        timestamp,
        eventId,
        String(event.orderId),
        event.orderNumber,
        event.eventType,
        event.newStatus,
        event.activityDescription,
      ],
      { prepare: true },
    ),
  ]);
}

export async function getOrderEvents(orderId, limit = 100) {
  const client = await ensureClient();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 200));
  const result = await client.execute(cql.selectOrderEvents, [String(orderId)], {
    prepare: true,
    fetchSize: safeLimit,
  });
  return result.rows.slice(0, safeLimit).map(toOrderEvent);
}

export async function getCustomerActivity(customerId, limit = 30) {
  const client = await ensureClient();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  // Partition keys are Cassandra text values. Callers may pass a Mongoose
  // ObjectId, so normalise it instead of sending a driver-incompatible type.
  const result = await client.execute(cql.selectCustomerActivity, [String(customerId)], {
    prepare: true,
    fetchSize: safeLimit,
  });
  return result.rows.slice(0, safeLimit).map((row) => ({
    eventId: row.event_id.toString(),
    timestamp: row.activity_timestamp.toISOString(),
    orderId: row.order_id,
    orderNumber: row.order_number,
    eventType: row.event_type,
    status: row.status,
    description: row.description,
  }));
}

export async function disconnectCassandra() {
  if (appClient) {
    await appClient.shutdown();
    appClient = null;
    logger.info('Cassandra disconnected');
  }
}

// Test-only helper. Tests set CASSANDRA_KEYSPACE=quickbite_test before import,
// so this never exposes the development keyspace by accident.
export function getCassandraClientForTests() {
  return appClient;
}
