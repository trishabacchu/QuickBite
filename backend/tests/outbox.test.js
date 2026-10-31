import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import config from '../src/config/env.js';
import { getCustomerActivity, getOrderEvents, writeOrderEvent } from '../src/database/cassandra.js';
import { Order } from '../src/models/Order.js';
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

async function createPendingOrder() {
  await addToCart(agent, fixtures.foods.burger._id, 2).expect(200);
  const order = await createOrder(agent, fixtures.address._id.toString());
  return { order, document: await Order.findById(order.id) };
}

function failingWriter() {
  return {
    writeOrderEvent: async () => {
      throw new Error('Cassandra unavailable for test');
    },
  };
}

describe('Cassandra event outbox', () => {
  it('delivers the order-placed event to both Cassandra tables', async () => {
    const { order } = await createPendingOrder();
    const now = new Date(Date.now() + 1000);

    const stats = await dispatchPendingEvents({ now });
    expect(stats).toMatchObject({ scannedOrders: 1, delivered: 1, failed: 0 });

    const updated = await Order.findById(order.id);
    expect(updated.eventOutbox).toHaveLength(1);
    expect(updated.eventOutbox[0]).toMatchObject({ status: 'delivered', attempts: 1 });
    expect(updated.eventOutbox[0].deliveredAt).toBeTruthy();
    expect(updated.eventOutbox[0].lastError).toBeNull();

    const events = await getOrderEvents(order.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventId: updated.eventOutbox[0].eventId,
      eventType: 'ORDER_PLACED',
      previousStatus: null,
      newStatus: 'PENDING',
      description: 'Order placed and waiting for restaurant confirmation.',
    });
    expect(events[0].metadata).toEqual({
      orderNumber: order.orderNumber,
      restaurantName: 'Open Kitchen',
    });

    const activity = await getCustomerActivity(fixtures.customer._id.toString());
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      eventId: updated.eventOutbox[0].eventId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      eventType: 'ORDER_PLACED',
      status: 'PENDING',
      description: 'Order placed at Open Kitchen.',
    });
  });

  it('retries with capped exponential backoff and keeps the stable event identity', async () => {
    const { order, document: original } = await createPendingOrder();
    const originalEventId = original.eventOutbox[0].eventId;
    const originalTimestamp = original.eventOutbox[0].eventTimestamp;

    const writer = failingWriter();
    let now = new Date(Date.now() + 1000);
    const expectedDelays = [500, 1000, 2000, 2000];

    for (const expectedDelay of expectedDelays) {
      const stats = await dispatchPendingEvents({ now, writer });
      expect(stats).toMatchObject({ delivered: 0, failed: 1 });

      const document = await Order.findById(order.id);
      const event = document.eventOutbox[0];
      expect(event.status).toBe('pending');
      expect(event.eventId).toBe(originalEventId);
      expect(event.lastError).toContain('Cassandra unavailable for test');
      expect(event.deliveredAt).toBeNull();
      expect(new Date(event.nextAttemptAt).getTime() - now.getTime()).toBe(expectedDelay);

      // Nothing is delivered in this window, and the timestamp never changes.
      expect(new Date(event.eventTimestamp).getTime()).toBe(new Date(originalTimestamp).getTime());
      now = new Date(event.nextAttemptAt);
    }

    const document = await Order.findById(order.id);
    expect(document.eventOutbox[0].attempts).toBe(expectedDelays.length);
    expect(config.OUTBOX_MAX_DELAY_MS).toBe(2000);

    // An immediate retry is skipped until the backoff timestamp is reached.
    const tooEarly = await dispatchPendingEvents({
      now: new Date(now.getTime() - 1),
      writer,
    });
    expect(tooEarly.scannedOrders).toBe(0);

    const recovered = await dispatchPendingEvents({ now });
    expect(recovered).toMatchObject({ delivered: 1, failed: 0 });

    const delivered = await Order.findById(order.id);
    expect(delivered.eventOutbox[0]).toMatchObject({ status: 'delivered', lastError: null });
    expect(delivered.eventOutbox[0].attempts).toBe(expectedDelays.length + 1);
  });

  it('is idempotent when the same event is written twice', async () => {
    const { order, document } = await createPendingOrder();
    const event = document.eventOutbox[0];

    const payload = {
      eventId: event.eventId,
      timestamp: event.eventTimestamp,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: fixtures.customer._id.toString(),
      eventType: event.eventType,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      description: event.description,
      activityDescription: event.activityDescription,
      metadata: { orderNumber: order.orderNumber, restaurantName: 'Open Kitchen' },
    };

    await writeOrderEvent(payload);
    await writeOrderEvent(payload);

    expect(await getOrderEvents(order.id)).toHaveLength(1);
    expect(await getCustomerActivity(fixtures.customer._id.toString())).toHaveLength(1);
  });

  it('does not duplicate timeline rows when a delivered event is replayed', async () => {
    const { order } = await createPendingOrder();
    const now = new Date(Date.now() + 1000);

    await dispatchPendingEvents({ now });
    const afterFirstDelivery = await Order.findById(order.id);
    const eventId = afterFirstDelivery.eventOutbox[0].eventId;

    // Simulate a crash after Cassandra accepted the write but before MongoDB
    // recorded delivery: the event is pending again and will be replayed.
    await Order.updateOne(
      { _id: order.id, 'eventOutbox.eventId': eventId },
      {
        $set: {
          'eventOutbox.$.status': 'pending',
          'eventOutbox.$.nextAttemptAt': now,
        },
      },
      { timestamps: false },
    );

    const replayed = await dispatchPendingEvents({ now });
    expect(replayed.delivered).toBe(1);

    const finalOrder = await Order.findById(order.id);
    expect(finalOrder.eventOutbox[0]).toMatchObject({ status: 'delivered', attempts: 2 });

    const events = await getOrderEvents(order.id);
    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe(eventId);

    const activity = await getCustomerActivity(fixtures.customer._id.toString());
    expect(activity).toHaveLength(1);
    expect(activity[0].eventId).toBe(eventId);
  });

  it('delivers a cancellation event to both tables alongside the placed event', async () => {
    const { order } = await createPendingOrder();
    const cancelled = await agent.post(`/api/v1/orders/${order.id}/cancel`).expect(200);
    expect(cancelled.body.data.order.status).toBe('CANCELLED');

    const stats = await dispatchPendingEvents({ now: new Date(Date.now() + 1000) });
    expect(stats).toMatchObject({ scannedOrders: 1, delivered: 2, failed: 0 });

    const events = await getOrderEvents(order.id);
    const eventTypes = events.map((event) => event.eventType).sort();
    expect(eventTypes).toEqual(['ORDER_CANCELLED', 'ORDER_PLACED']);

    const cancellation = events.find((event) => event.eventType === 'ORDER_CANCELLED');
    expect(cancellation).toMatchObject({
      previousStatus: 'PENDING',
      newStatus: 'CANCELLED',
      description: 'Order cancelled by the customer.',
    });

    const activity = await getCustomerActivity(fixtures.customer._id.toString());
    expect(activity).toHaveLength(2);
    expect(activity.map((entry) => entry.eventType).sort()).toEqual([
      'ORDER_CANCELLED',
      'ORDER_PLACED',
    ]);
    expect(activity.find((entry) => entry.eventType === 'ORDER_CANCELLED')).toMatchObject({
      orderNumber: order.orderNumber,
      status: 'CANCELLED',
      description: `Order ${order.orderNumber} was cancelled.`,
    });
  });
});
