import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import config from './config/env.js';
import { cassandraIsReady } from './database/cassandra.js';
import { mongoIsReady } from './database/mongodb.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { originGuard } from './middleware/origin-guard.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(originGuard);

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'quickbite-api',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.get('/ready', async (_req, res) => {
    const [mongodb, cassandra] = await Promise.all([mongoIsReady(), cassandraIsReady()]);
    const ready = mongodb && cassandra;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      dependencies: {
        mongodb: { status: mongodb ? 'up' : 'down' },
        cassandra: { status: cassandra ? 'up' : 'down' },
      },
    });
  });

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
