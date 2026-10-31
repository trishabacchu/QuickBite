import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Order } from '../src/models/Order.js';
import { advanceDueOrders } from '../src/services/order-status.service.js';
import { dispatchPendingEvents } from '../src/services/event-outbox.service.js';
import {
  addToCart,
  createOrder,
  loginAgent,
  resetTestDatabase,
  seedFixtures,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers.js';

let app;
let fixtures;
let agent;

beforeAll(async () => {
  await setupTestDatabase();
  app = createApp();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase();
  fixtures = await seedFixtures();
  agent = await loginAgent(app);
});

describe('checkout and orders', () => {
  it('creates an order using server-side prices and clears the cart', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 2).expect(200);

    const response = await agent
      .post('/api/v1/orders')
      .send({
        addressId: fixtures.address._id.toString(),
        paymentMethod: 'COD',
        // A malicious client value must be ignored: totals come from MongoDB.
        totalPaise: 1,
      })
      .expect(201);

    const { order } = response.body.data;
    expect(order).toMatchObject({
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotalPaise: 50000,
      deliveryFeePaise: 2500,
      totalPaise: 52500,
      canCancel: true,
    });
    expect(order.orderNumber).toMatch(/^QB-\d{8}-[A-F0-9]{6}$/);
    expect(order.items[0]).toMatchObject({
      name: 'Test Burger',
      quantity: 2,
      unitPricePaise: 25000,
      lineTotalPaise: 50000,
    });
    expect(order.deliveryAddress).toMatchObject({
      label: 'Home',
      city: 'Bengaluru',
      postalCode: '560038',
    });

    const cart = await agent.get('/api/v1/cart').expect(200);
    expect(cart.body.data.cart.items).toHaveLength(0);
  });

  it('keeps immutable order snapshots when the source address changes', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const order = await createOrder(agent, fixtures.address._id.toString());

    await agent
      .patch(`/api/v1/addresses/${fixtures.address._id}`)
      .send({ line1: '99 Changed Street, Somewhere New' })
      .expect(200);

    const fetched = await agent.get(`/api/v1/orders/${order.id}`).expect(200);
    expect(fetched.body.data.order.deliveryAddress.line1).toBe('12 Test Lane, Indiranagar');
  });

  it('rejects checkout with an empty cart or an address that is not yours', async () => {
    const empty = await agent
      .post('/api/v1/orders')
      .send({ addressId: fixtures.address._id.toString(), paymentMethod: 'COD' })
      .expect(400);
    expect(empty.body.error.code).toBe('EMPTY_CART');

    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const foreignAddress = await agent
      .post('/api/v1/orders')
      .send({ addressId: new mongoose.Types.ObjectId().toString(), paymentMethod: 'COD' })
      .expect(400);
    expect(foreignAddress.body.error.code).toBe('INVALID_DELIVERY_ADDRESS');

    const badPayment = await agent
      .post('/api/v1/orders')
      .send({ addressId: fixtures.address._id.toString(), paymentMethod: 'CARD' })
      .expect(400);
    expect(badPayment.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('cancels only a pending order and never advances it afterwards', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const order = await createOrder(agent, fixtures.address._id.toString());

    const cancelled = await agent.post(`/api/v1/orders/${order.id}/cancel`).expect(200);
    expect(cancelled.body.data.order.status).toBe('CANCELLED');
    expect(cancelled.body.data.order.canCancel).toBe(false);
    expect(cancelled.body.data.order.nextStatusAt).toBeNull();

    const again = await agent.post(`/api/v1/orders/${order.id}/cancel`).expect(409);
    expect(again.body.error.code).toBe('ORDER_CANNOT_CANCEL');

    await advanceDueOrders(new Date(Date.now() + 60_000));
    const fetched = await agent.get(`/api/v1/orders/${order.id}`).expect(200);
    expect(fetched.body.data.order.status).toBe('CANCELLED');
  });

  it('moves through the full delivery lifecycle exactly once per stage', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const order = await createOrder(agent, fixtures.address._id.toString());

    await Order.updateOne(
      { _id: order.id },
      { $set: { nextStatusAt: new Date(Date.now() - 1000) } },
    );

    const expected = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    for (let index = 0; index < expected.length; index += 1) {
      const result = await advanceDueOrders(new Date(Date.now() + index * 60_000));
      expect(result.advanced).toBe(1);

      const current = await Order.findById(order.id);
      expect(current.status).toBe(expected[index]);
      expect(current.eventOutbox).toHaveLength(index + 2); // placed + each transition
    }

    const delivered = await agent.get(`/api/v1/orders/${order.id}`).expect(200);
    expect(delivered.body.data.order).toMatchObject({
      status: 'DELIVERED',
      canCancel: false,
      paymentStatus: 'PENDING',
      nextStatusAt: null,
    });
    expect(delivered.body.data.order.deliveredAt).toBeTruthy();

    const cancel = await agent.post(`/api/v1/orders/${order.id}/cancel`).expect(409);
    expect(cancel.body.error.code).toBe('ORDER_CANNOT_CANCEL');
  });

  it('serves the customer activity feed newest first after outbox delivery', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const order = await createOrder(agent, fixtures.address._id.toString());
    await agent.post(`/api/v1/orders/${order.id}/cancel`).expect(200);

    await dispatchPendingEvents({ now: new Date(Date.now() + 1000) });

    const response = await agent.get('/api/v1/orders/activity').expect(200);
    const activity = response.body.data.activity;
    expect(activity).toHaveLength(2);
    expect(activity[0]).toMatchObject({
      orderId: order.id,
      orderNumber: order.orderNumber,
      eventType: 'ORDER_CANCELLED',
      status: 'CANCELLED',
    });
    expect(activity[1]).toMatchObject({
      orderId: order.id,
      eventType: 'ORDER_PLACED',
      status: 'PENDING',
    });
    expect(new Date(activity[0].timestamp) > new Date(activity[1].timestamp)).toBe(true);
  });

  it('prevents one customer from reading or cancelling another customer order', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const order = await createOrder(agent, fixtures.address._id.toString());

    const otherAgent = request.agent(app);
    await otherAgent
      .post('/api/v1/auth/register')
      .send({ name: 'Other Customer', email: 'other@quickbite.local', password: 'OtherPass123' })
      .expect(201);

    const read = await otherAgent.get(`/api/v1/orders/${order.id}`).expect(404);
    expect(read.body.error.code).toBe('ORDER_NOT_FOUND');

    const timeline = await otherAgent.get(`/api/v1/orders/${order.id}/events`).expect(404);
    expect(timeline.body.error.code).toBe('ORDER_NOT_FOUND');

    const cancel = await otherAgent.post(`/api/v1/orders/${order.id}/cancel`).expect(404);
    expect(cancel.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('lists only the signed-in customer orders, newest first', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);
    const first = await createOrder(agent, fixtures.address._id.toString());
    await addToCart(agent, fixtures.foods.secondFood._id, 1).expect(200);
    const second = await createOrder(agent, fixtures.address._id.toString());

    const response = await agent.get('/api/v1/orders').expect(200);
    expect(response.body.data.orders).toHaveLength(2);
    expect(response.body.data.orders[0].id).toBe(second.id);
    expect(response.body.data.orders[1].id).toBe(first.id);
  });
});
