import { randomUUID } from 'node:crypto';
import {
  EVENT_TYPE,
  ORDER_STATUS_LABELS,
  STATUS_EVENT_DESCRIPTIONS,
} from '../constants/order.js';

/**
 * Builds the durable event intent stored in the order's embedded outbox. The
 * event ID and timestamp are generated once and reused by every retry.
 */
export function buildOutboxEvent({
  eventType,
  previousStatus = null,
  newStatus,
  description,
  activityDescription,
  eventTimestamp = new Date(),
}) {
  const timestamp = new Date(eventTimestamp);
  return {
    eventId: randomUUID(),
    eventType,
    previousStatus,
    newStatus,
    description,
    activityDescription,
    eventTimestamp: timestamp,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: timestamp,
    lastError: null,
    deliveredAt: null,
  };
}

export function buildStatusEvent(order, newStatus, { eventType, previousStatus, timestamp }) {
  const statusLabel = ORDER_STATUS_LABELS[newStatus] || newStatus;
  return buildOutboxEvent({
    eventType,
    previousStatus,
    newStatus,
    description:
      STATUS_EVENT_DESCRIPTIONS[newStatus] ||
      (eventType === EVENT_TYPE.ORDER_PLACED
        ? 'Order placed and waiting for restaurant confirmation.'
        : `Order status updated to ${statusLabel}.`),
    activityDescription: `Order ${order.orderNumber} is now ${statusLabel.toLowerCase()}.`,
    eventTimestamp: timestamp,
  });
}

export function nextEventTimestamp(order, now = new Date()) {
  const recentTimes = (order.eventOutbox || []).map((event) =>
    new Date(event.eventTimestamp).getTime(),
  );
  const latest = Math.max(order.createdAt ? new Date(order.createdAt).getTime() : 0, ...recentTimes, 0);
  return new Date(Math.max(now.getTime(), latest + 1));
}
