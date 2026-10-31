// Idempotent development schema. In Cassandra, partition keys determine which
// node owns a row and clustering columns determine the on-disk/query order.
export function cassandraSchemaStatements(keyspace) {
  return [
    `CREATE KEYSPACE IF NOT EXISTS ${keyspace}
     WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`,

    // Access pattern 1: all events for one order, oldest first.
    `CREATE TABLE IF NOT EXISTS ${keyspace}.order_events_by_order (
       order_id text,
       event_timestamp timestamp,
       event_id uuid,
       customer_id text,
       event_type text,
       previous_status text,
       new_status text,
       description text,
       metadata text,
       PRIMARY KEY ((order_id), event_timestamp, event_id)
     ) WITH CLUSTERING ORDER BY (event_timestamp ASC, event_id ASC)`,

    // Access pattern 2: a customer's most recent activity, newest first.
    // Unbounded customer histories would eventually be time-bucketed.
    `CREATE TABLE IF NOT EXISTS ${keyspace}.customer_order_activity_by_customer (
       customer_id text,
       activity_timestamp timestamp,
       event_id uuid,
       order_id text,
       order_number text,
       event_type text,
       status text,
       description text,
       PRIMARY KEY ((customer_id), activity_timestamp, event_id)
     ) WITH CLUSTERING ORDER BY (activity_timestamp DESC, event_id DESC)`,
  ];
}

export async function ensureCassandraSchema(client, keyspace) {
  for (const statement of cassandraSchemaStatements(keyspace)) {
    await client.execute(statement);
  }
}
