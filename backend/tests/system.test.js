import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, teardownTestDatabase } from './helpers.js';

let app;

beforeAll(async () => {
  await setupTestDatabase();
  app = createApp();
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('system endpoints and error handling', () => {
  it('reports liveness without touching the databases', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'quickbite-api' });
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports readiness only when MongoDB and Cassandra are reachable', async () => {
    const response = await request(app).get('/ready').expect(200);
    expect(response.body).toEqual({
      status: 'ready',
      dependencies: {
        mongodb: { status: 'up' },
        cassandra: { status: 'up' },
      },
    });
  });

  it('returns a consistent JSON error for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404);
    expect(response.body.error).toMatchObject({
      code: 'ROUTE_NOT_FOUND',
      details: [],
    });
    expect(response.body.error.message).toContain('/api/v1/does-not-exist');
  });

  it('rejects malformed JSON and oversized bodies with JSON errors', async () => {
    const malformed = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken"')
      .expect(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');

    const oversized = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'x'.repeat(120 * 1024) })
      .expect(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects malformed identifiers before they reach the database', async () => {
    const response = await request(app).get('/api/v1/restaurants/not-an-object-id').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0]).toMatchObject({ field: 'id' });
  });

  it('sets baseline security headers and hides the framework signature', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
