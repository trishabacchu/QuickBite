import config from '../config/env.js';
import {
  EVENT_TYPE,
  NEXT_ORDER_STATUS,
  ORDER_STATUS,
  ORDER_STATUS_SEQUENCE,
} from '../constants/order.js';
import { Order } from '../models/Order.js';
import { logger } from '../utils/logger.js';
import { buildStatusEvent, nextEventTimestamp } from './order-events.js';

/**
 * Advances one persisted due order using a conditional update. The condition on
 * the current status means overlapping workers (or a cancelled order) cannot
 * cause the same transition twice.
 */
export async function advanceDueOrders(now = new Date(), limit = config.ORDER_WORKER_BATCH_SIZE) {
  const dueOrders = await Order.find({
    status: { $in: ORDER_STATUS_SEQUENCE.slice(0, -1) },
    nextStatusAt: { $lte: now },
  })
    .sort({ nextStatusAt: 1 })
    .limit(limit);

  let advanced = 0;

  for (const order of dueOrders) {
    const nextStatus = NEXT_ORDER_STATUS[order.status];
    if (!nextStatus) continue;

    const plannedTransitionTime = order.nextStatusAt
      ? new Date(order.nextStatusAt)
      : new Date(now);
    const eventTimestamp = nextEventTimestamp(order, plannedTransitionTime);
    const nextStatusAt =
      nextStatus === ORDER_STATUS.DELIVERED
        ? null
        : new Date(plannedTransitionTime.getTime() + config.ORDER_STATUS_INTERVAL_MS);

    const event = buildStatusEvent(order, nextStatus, {
      eventType: EVENT_TYPE.STATUS_CHANGED,
      previousStatus: order.status,
      timestamp: eventTimestamp,
    });

    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: order.status,
        nextStatusAt: { $lte: now },
      },
      {
        $set: {
          status: nextStatus,
          nextStatusAt,
          updatedAt: new Date(),
          ...(nextStatus === ORDER_STATUS.DELIVERED
            ? { deliveredAt: eventTimestamp }
            : {}),
        },
        $push: { eventOutbox: event },
      },
      { new: true },
    );

    if (updated) {
      advanced += 1;
      logger.info('Order status advanced', {
        orderId: updated._id.toString(),
        orderNumber: updated.orderNumber,
        from: order.status,
        to: nextStatus,
      });
    }
  }

  return { scanned: dueOrders.length, advanced };
}

let statusWorkerTimer = null;
let statusWorkerRunning = false;

export async function runOrderStatusWorkerOnce(now = new Date()) {
  if (statusWorkerRunning) return { skipped: true };
  statusWorkerRunning = true;
  try {
    return await advanceDueOrders(now);
  } catch (error) {
    logger.error('Order status worker failed', { error: error.message });
    return { error: true };
  } finally {
    statusWorkerRunning = false;
  }
}

export function startOrderStatusWorker() {
  if (statusWorkerTimer) return () => {};
  const tick = () => {
    void runOrderStatusWorkerOnce();
  };
  statusWorkerTimer = setInterval(tick, config.ORDER_WORKER_POLL_INTERVAL_MS);
  // Run once shortly after startup, not inside a request handler.
  const initialTimer = setTimeout(tick, 1000);
  initialTimer.unref();
  logger.info('Order status worker started', {
    pollIntervalMs: config.ORDER_WORKER_POLL_INTERVAL_MS,
    statusIntervalMs: config.ORDER_STATUS_INTERVAL_MS,
  });
  return () => {
    if (statusWorkerTimer) clearInterval(statusWorkerTimer);
    statusWorkerTimer = null;
    clearTimeout(initialTimer);
  };
}
