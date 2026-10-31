import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// The project keeps one shared local .env at the repository root. When a
// backend command runs from backend/, also look one directory up.
const possibleEnvFiles = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
];

for (const envFile of possibleEnvFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, quiet: true });
    break;
  }
}

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const optionalNonEmptyString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || '');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),

  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .default('mongodb://quickbite:quickbite_dev_password@localhost:27017/quickbite?authSource=admin'),
  MONGODB_DB_NAME: z.string().trim().min(1).default('quickbite'),

  CASSANDRA_CONTACT_POINTS: z.string().min(1).default('127.0.0.1'),
  CASSANDRA_PORT: z.coerce.number().int().positive().default(9042),
  CASSANDRA_LOCAL_DATACENTER: z.string().trim().min(1).default('datacenter1'),
  CASSANDRA_KEYSPACE: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,47}$/, 'CASSANDRA_KEYSPACE must be a valid lowercase CQL identifier')
    .default('quickbite'),
  CASSANDRA_USERNAME: optionalNonEmptyString,
  CASSANDRA_PASSWORD: optionalNonEmptyString,

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(2).default('7d'),
  AUTH_COOKIE_NAME: z.string().min(1).default('quickbite_token'),
  COOKIE_SECURE: booleanString.default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  ENABLE_WORKERS: booleanString.default(true),
  ORDER_STATUS_INTERVAL_MS: z.coerce.number().int().min(1000).default(12000),
  ORDER_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2000),
  ORDER_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(20),
  OUTBOX_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2000),
  OUTBOX_BASE_DELAY_MS: z.coerce.number().int().min(500).default(2000),
  OUTBOX_MAX_DELAY_MS: z.coerce.number().int().min(1000).default(120000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(20),

  AUTO_SEED: booleanString.default(false),
  DEMO_CUSTOMER_NAME: z.string().trim().min(2).default('Demo Customer'),
  DEMO_CUSTOMER_EMAIL: z.string().email().default('demo@quickbite.local'),
  DEMO_CUSTOMER_PASSWORD: z.string().min(6).default('Demo@123'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const insecureSecret = /local|replace|change|secret|password/i.test(env.JWT_SECRET);
  if (insecureSecret) {
    throw new Error('JWT_SECRET looks like a development placeholder and cannot be used in production.');
  }
  if (!env.COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in production.');
  }
  if (env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_SECURE) {
    throw new Error('SameSite=None cookies require Secure cookies.');
  }
}

if (env.OUTBOX_MAX_DELAY_MS < env.OUTBOX_BASE_DELAY_MS) {
  throw new Error('OUTBOX_MAX_DELAY_MS must be greater than or equal to OUTBOX_BASE_DELAY_MS.');
}

export const config = Object.freeze({
  ...env,
  cassandraContactPoints: env.CASSANDRA_CONTACT_POINTS.split(',')
    .map((point) => point.trim())
    .filter(Boolean),
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
});

export default config;
