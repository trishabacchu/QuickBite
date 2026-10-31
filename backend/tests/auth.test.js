import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import {
  loginAgent,
  resetTestDatabase,
  seedFixtures,
  setupTestDatabase,
  teardownTestDatabase,
  TEST_CUSTOMER,
} from './helpers.js';

let app;

beforeAll(async () => {
  await setupTestDatabase();
  app = createApp();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase();
  await seedFixtures();
});

describe('authentication', () => {
  it('registers a customer, sets an HttpOnly cookie, and returns the current customer', async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/v1/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ADA@Example.com', password: 'Secret123' })
      .expect(201);

    expect(response.body.data.customer).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(response.body.data.customer).not.toHaveProperty('passwordHash');

    const cookie = response.headers['set-cookie']?.[0] || '';
    expect(cookie).toContain('quickbite_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.customer.email).toBe('ada@example.com');
  });

  it('rejects invalid registration and duplicate email addresses', async () => {
    const invalid = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalid.body.error.details.length).toBeGreaterThanOrEqual(2);

    const duplicate = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Another Customer', email: TEST_CUSTOMER.email, password: 'Secret123' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('signs in with valid credentials and rejects a wrong password', async () => {
    const agent = await loginAgent(app);
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.customer.email).toBe(TEST_CUSTOMER.email);

    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_CUSTOMER.email, password: 'WrongPassword' })
      .expect(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('requires authentication for protected routes', async () => {
    const response = await request(app).get('/api/v1/cart').expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');

    const orders = await request(app).get('/api/v1/orders').expect(401);
    expect(orders.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('updates the customer profile and rejects malformed phone numbers', async () => {
    const agent = await loginAgent(app);

    const updated = await agent
      .patch('/api/v1/profile')
      .send({ name: 'Updated Customer', phone: '+91 98765 43210' })
      .expect(200);
    expect(updated.body.data.customer).toMatchObject({
      name: 'Updated Customer',
      phone: '+91 98765 43210',
    });

    const invalid = await agent
      .patch('/api/v1/profile')
      .send({ name: 'Updated Customer', phone: 'abc' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('changes the password and invalidates every previous session', async () => {
    const agent = await loginAgent(app);

    const changed = await agent
      .post('/api/v1/profile/change-password')
      .send({ currentPassword: TEST_CUSTOMER.password, newPassword: 'NewPassword123' })
      .expect(200);
    expect(changed.body.data.message).toMatch(/sign in again/i);

    await agent.get('/api/v1/auth/me').expect(401);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_CUSTOMER.email, password: TEST_CUSTOMER.password })
      .expect(401);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_CUSTOMER.email, password: 'NewPassword123' })
      .expect(200);
  });

  it('clears the auth cookie on logout', async () => {
    const agent = await loginAgent(app);
    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.get('/api/v1/auth/me').expect(401);
  });
});
