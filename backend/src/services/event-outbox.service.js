import config from '../config/env.js';
import { writeOrderEvent } from '../database/cassandra.js';
import { Order } from '../models/Order.js';
import { logger } from '../utils/logger.js';

const defaultWriter = { writeOrderEvent };

function backoffDelay(attempts) {
  const exponent = Math.min(Math.max(attempts - 1, 0), 10);
  return Math.min(config.OUTBOX_BASE_DELAY_MS * 2 ** exponent, config.OUTBOX_MAX_DELAY_MS);
}

/**
 * Delivers pending outbox entries to both Cassandra tables. Both writes use the
 * same event ID and timestamp on every attempt; Cassandra INSERT is an upsert,
 * so a crash after a write but before MongoDB marks it delivered is safe.
 *
 * `writer` is injectable so the failure/retry test can simulate Cassandra being
 * unavailable without stopping the database container.
 */
export async function dispatchPendingEvents({
  now = new Date(),
  limit = config.OUTBOX_BATCH_SIZE,
  writer = defaultWriter,
} = {}) {
  const orders = await Order.find({
    eventOutbox: {
      $elemMatch: { status: 'pending', nextAttemptAt: { $lte: now } },
    },
  }).limit(limit);

  const stats = { scannedOrders: orders.length, delivered: 0, failed: 0 };

  for (const order of orders) {
    const dueEvents = order.eventOutbox.filter(
      (event) => event.status === 'pending' && new Date(event.nextAttemptAt) <= now,
    );

    for (const event of dueEvents) {
      const attempts = event.attempts + 1;
      try {
        await writer.writeOrderEvent({
          eventId: event.eventId,
          timestamp: event.eventTimestamp,
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerId: order.customerId.toString(),
          eventType: event.eventType,
          previousStatus: event.previousStatus,
          newStatus: event.newStatus,
          description: event.description,
          activityDescription: event.activityDescription,
          metadata: {
            orderNumber: order.orderNumber,
            restaurantName: order.restaurantSnapshot.name,
          },
        });

        await Order.updateOne(
          {
            _id: order._id,
            eventOutbox: {
              $elemMatch: { eventId: event.eventId, status: 'pending' },
            },
          },
          {
            $set: {
              'eventOutbox.$[entry].status': 'delivered',
              'eventOutbox.$[entry].attempts': attempts,
              'eventOutbox.$[entry].lastError': null,
              'eventOutbox.$[entry].deliveredAt': new Date(),
            },
          },
          {
            arrayFilters: [{ 'entry.eventId': event.eventId, 'entry.status': 'pending' }],
            timestamps: false,
          },
        );
        stats.delivered += 1;
      } catch (error) {
        // Retain the event forever. Reaching the maximum backoff slows retries
        // but never discards the event or permanently gives up.
        await Order.updateOne(
          {
            _id: order._id,
            eventOutbox: {
              $elemMatch: { eventId: event.eventId, status: 'pending' },
            },
          },
          {
            $set: {
              'eventOutbox.$[entry].attempts': attempts,
              'eventOutbox.$[entry].nextAttemptAt': new Date(now.getTime() + backoffDelay(attempts)),
              'eventOutbox.$[entry].lastError': String(error.message || 'Cassandra write failed').slice(
                0,
                500,
              ),
            },
          },
          {
            arrayFilters: [{ 'entry.eventId': event.eventId, 'entry.status': 'pending' }],
            timestamps: false,
          },
        ).catch((updateError) => {
          logger.error('Could not persist outbox retry metadata', {
            eventId: event.eventId,
            error: updateError.message,
          });
        });

        stats.failed += 1;
        logger.warn('Cassandra event delivery failed; will retry', {
          orderNumber: order.orderNumber,
          eventId: event.eventId,
          attempts,
          error: error.message,
        });
      }
    }
  }

  if (stats.delivered > 0 || stats.failed > 0) {
    logger.info('Outbox dispatch completed', stats);
  }

  return stats;
}

let outboxTimer = null;
let outboxRunning = false;

export async function runEventOutboxWorkerOnce(now = new Date()) {
  if (outboxRunning) return { skipped: true };
  outboxRunning = true;
  try {
    return await dispatchPendingEvents({ now });
  } catch (error) {
    logger.error('Event outbox worker failed', { error: error.message });
    return { error: true };
  } finally {
    outboxRunning = false;
  }
}

export function startEventOutboxWorker() {
  if (outboxTimer) return () => {};
  const initialTimer = setTimeout(() => {
    void runEventOutboxWorkerOnce();
  }, 500);
  initialTimer.unref();
  outboxTimer = setInterval(() => {
    void runEventOutboxWorkerOnce();
  }, config.OUTBOX_WORKER_POLL_INTERVAL_MS);

  logger.info('Event outbox worker started', {
    pollIntervalMs: config.OUTBOX_WORKER_POLL_INTERVAL_MS,
    baseDelayMs: config.OUTBOX_BASE_DELAY_MS,
  });

  return () => {
    if (outboxTimer) clearInterval(outboxTimer);
    outboxTimer = null;
    clearTimeout(initialTimer);
  };
}
