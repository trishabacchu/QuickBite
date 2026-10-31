import mongoose from 'mongoose';
import config from '../config/env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function connectMongo({ retries = 15, baseDelayMs = 1000 } = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        dbName: config.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        autoIndex: config.NODE_ENV !== 'production',
      });
      logger.info('MongoDB connected', { database: config.MONGODB_DB_NAME });
      return mongoose.connection;
    } catch (error) {
      if (attempt === retries) {
        logger.error('MongoDB connection failed after retries', { attempt, error: error.message });
        throw error;
      }
      const delay = Math.min(baseDelayMs * attempt, 5000);
      logger.warn('MongoDB not ready; retrying', { attempt, retryInMs: delay });
      await sleep(delay);
    }
  }

  throw new Error('MongoDB connection could not be established.');
}

export async function mongoIsReady() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}
