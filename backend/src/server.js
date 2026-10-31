import config from './config/env.js';
import { createApp } from './app.js';
import { connectCassandra, disconnectCassandra } from './database/cassandra.js';
import { connectMongo, disconnectMongo } from './database/mongodb.js';
import {
  startEventOutboxWorker,
  runEventOutboxWorkerOnce,
} from './services/event-outbox.service.js';
import {
  startOrderStatusWorker,
  runOrderStatusWorkerOnce,
} from './services/order-status.service.js';
import { logger } from './utils/logger.js';

let server;
let stopOrderWorker = () => {};
let stopOutboxWorker = () => {};
let shuttingDown = false;

async function start() {
  await connectMongo({ retries: 20, baseDelayMs: 1000 });

  try {
    await connectCassandra({ retries: 10, baseDelayMs: 1000 });
  } catch {
    // The API can still serve MongoDB-backed pages. The outbox keeps event
    // intents and retries; readiness will report Cassandra as unavailable until
    // it returns.
    logger.warn('Starting without Cassandra; readiness is degraded and events will retry.');
  }

  const app = createApp();
  server = app.listen(config.PORT, () => {
    logger.info('QuickBite API listening', {
      url: `http://localhost:${config.PORT}`,
      environment: config.NODE_ENV,
      frontendOrigin: config.FRONTEND_ORIGIN,
    });
  });

  if (config.ENABLE_WORKERS) {
    stopOrderWorker = startOrderStatusWorker();
    stopOutboxWorker = startEventOutboxWorker();
    void runOrderStatusWorkerOnce();
    void runEventOutboxWorkerOnce();
  } else {
    logger.info('Background workers are disabled by environment configuration.');
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down', { signal });

  stopOrderWorker();
  stopOutboxWorker();

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
      setTimeout(resolve, 8000).unref();
    });
  }

  await Promise.allSettled([disconnectMongo(), disconnectCassandra()]);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
  void shutdown('unhandledRejection');
});

start().catch((error) => {
  logger.error('Server failed to start', { error: error.message });
  process.exit(1);
});
