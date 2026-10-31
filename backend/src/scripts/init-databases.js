import config from '../config/env.js';
import { connectCassandra, disconnectCassandra, getOrderEvents } from '../database/cassandra.js';
import { connectMongo, disconnectMongo } from '../database/mongodb.js';
import { Address } from '../models/Address.js';
import { Cart } from '../models/Cart.js';
import { Customer } from '../models/Customer.js';
import { FoodItem } from '../models/FoodItem.js';
import { Order } from '../models/Order.js';
import { Restaurant } from '../models/Restaurant.js';
import { logger } from '../utils/logger.js';

// Initialization is additive/idempotent. It never drops a database, keyspace,
// collection, or table.
async function initialize() {
  await connectMongo({ retries: 15 });
  await Promise.all([
    Customer.createIndexes(),
    Restaurant.createIndexes(),
    FoodItem.createIndexes(),
    Cart.createIndexes(),
    Address.createIndexes(),
    Order.createIndexes(),
  ]);
  logger.info('MongoDB indexes ensured');

  await connectCassandra({ retries: 15 });
  // A harmless bounded query verifies the keyspace and clustering schema are
  // usable, not merely that the port is open.
  await getOrderEvents('000000000000000000000000', 1);
  logger.info('Cassandra schema ensured', { keyspace: config.CASSANDRA_KEYSPACE });

  console.log('\nDatabases initialized. No data was deleted.');
  console.log(`MongoDB database: ${config.MONGODB_DB_NAME}`);
  console.log(`Cassandra keyspace: ${config.CASSANDRA_KEYSPACE}\n`);
}

try {
  await initialize();
} catch (error) {
  logger.error('Database initialization failed', { error: error.message });
  process.exitCode = 1;
} finally {
  await Promise.allSettled([disconnectMongo(), disconnectCassandra()]);
}
