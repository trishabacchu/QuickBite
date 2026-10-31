import { randomBytes } from 'node:crypto';
import config from '../config/env.js';
import {
  EVENT_TYPE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  STATUS_EVENT_DESCRIPTIONS,
} from '../constants/order.js';
import { getCustomerActivity, getOrderEvents } from '../database/cassandra.js';
import { Address } from '../models/Address.js';
import { Cart } from '../models/Cart.js';
import { FoodItem } from '../models/FoodItem.js';
import { Order } from '../models/Order.js';
import { Restaurant } from '../models/Restaurant.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { serializeOrder } from '../utils/serializers.js';
import { getRestaurantAvailability, getIstDateStamp } from '../utils/time.js';
import { buildOutboxEvent, nextEventTimestamp } from './order-events.js';

const MAX_ITEM_QUANTITY = 10;

function createOrderNumber(now = new Date()) {
  // Random suffix + a unique MongoDB index. This avoids a race-prone
  // "read the maximum order number, then add one" sequence. Retries handle the
  // extremely unlikely collision.
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `QB-${getIstDateStamp(now)}-${suffix}`;
}

function itemProblem(cartItem, food) {
  if (!food || !food.isActive) {
    return { foodItemId: cartItem.foodItemId.toString(), name: 'Unknown item', reason: 'No longer on the menu' };
  }
  if (!food.isAvailable) {
    return { foodItemId: food._id.toString(), name: food.name, reason: 'Currently unavailable' };
  }
  return null;
}

export async function createOrder(customerId, { addressId, paymentMethod }) {
  if (paymentMethod !== PAYMENT_METHOD.COD) {
    throw ApiError.badRequest('UNSUPPORTED_PAYMENT_METHOD', 'Only Cash on Delivery is supported.');
  }

  const cart = await Cart.findOne({ customerId });
  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('EMPTY_CART', 'Add at least one item before checking out.');
  }

  const restaurant = await Restaurant.findById(cart.restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw ApiError.conflict(
      'RESTAURANT_UNAVAILABLE',
      'The restaurant is no longer accepting orders. Your cart has been kept.',
    );
  }

  const availability = getRestaurantAvailability(restaurant);
  if (!availability.isOpen) {
    throw ApiError.conflict(
      'RESTAURANT_CLOSED',
      `${restaurant.name} is currently closed. Your cart has been kept so you can order later.`,
    );
  }

  const foods = await FoodItem.find({
    _id: { $in: cart.items.map((item) => item.foodItemId) },
  });
  const foodMap = new Map(foods.map((food) => [food._id.toString(), food]));

  const problems = [];
  const orderItems = [];

  for (const cartItem of cart.items) {
    const food = foodMap.get(cartItem.foodItemId.toString());
    const problem = itemProblem(cartItem, food);
    if (problem) {
      problems.push(problem);
      continue;
    }
    if (
      !Number.isInteger(cartItem.quantity) ||
      cartItem.quantity < 1 ||
      cartItem.quantity > MAX_ITEM_QUANTITY
    ) {
      problems.push({
        foodItemId: food._id.toString(),
        name: food.name,
        reason: 'Quantity must be between 1 and 10',
      });
      continue;
    }
    if (food.restaurantId.toString() !== restaurant._id.toString()) {
      throw ApiError.conflict(
        'INVALID_CART',
        'Your cart contains items from more than one restaurant. Clear the cart and try again.',
      );
    }

    orderItems.push({
      foodItemId: food._id,
      name: food.name,
      imageUrl: food.imageUrl,
      category: food.category,
      unitPricePaise: food.pricePaise,
      quantity: cartItem.quantity,
      lineTotalPaise: food.pricePaise * cartItem.quantity,
    });
  }

  if (problems.length > 0) {
    throw ApiError.conflict(
      'CART_ITEMS_UNAVAILABLE',
      'Some items are no longer available. Remove or update them, then try again. Your cart has been kept.',
      problems,
    );
  }
  if (orderItems.length === 0) {
    throw ApiError.badRequest('EMPTY_CART', 'Add at least one item before checking out.');
  }

  const address = await Address.findOne({ _id: addressId, customerId });
  if (!address) {
    throw ApiError.badRequest(
      'INVALID_DELIVERY_ADDRESS',
      'Select one of your saved delivery addresses.',
    );
  }

  const subtotalPaise = orderItems.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const deliveryFeePaise = restaurant.deliveryFeePaise;
  const totalPaise = subtotalPaise + deliveryFeePaise;

  const now = new Date();
  const eventTimestamp = now;
  const initialEvent = buildOutboxEvent({
    eventType: EVENT_TYPE.ORDER_PLACED,
    previousStatus: null,
    newStatus: ORDER_STATUS.PENDING,
    description: STATUS_EVENT_DESCRIPTIONS[ORDER_STATUS.PENDING],
    activityDescription: `Order placed at ${restaurant.name}.`,
    eventTimestamp,
  });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const order = await Order.create({
        orderNumber: createOrderNumber(now),
        customerId,
        restaurantId: restaurant._id,
        restaurantSnapshot: {
          restaurantId: restaurant._id,
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          imageUrl: restaurant.imageUrl,
        },
        items: orderItems,
        subtotalPaise,
        deliveryFeePaise,
        totalPaise,
        deliveryAddressSnapshot: {
          label: address.label,
          line1: address.line1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
        },
        paymentMethod: PAYMENT_METHOD.COD,
        paymentStatus: PAYMENT_STATUS.PENDING,
        status: ORDER_STATUS.PENDING,
        estimatedDeliveryMinutes: restaurant.deliveryTimeMinutes,
        nextStatusAt: new Date(now.getTime() + config.ORDER_STATUS_INTERVAL_MS),
        // Order + outbox intent are one atomic document insert.
        eventOutbox: [initialEvent],
      });

      // The order is authoritative now. If clearing the cart failed, keeping the
      // cart is safer than discarding the successful order; the customer can
      // clear it manually.
      try {
        await Cart.deleteOne({ _id: cart._id });
      } catch (error) {
        logger.warn('Order created but cart cleanup failed', {
          orderId: order._id.toString(),
          error: error.message,
        });
      }

      logger.info('Order created', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      });
      return serializeOrder(order);
    } catch (error) {
      if (error.code === 11000 && (error.keyPattern?.orderNumber || error.keyValue?.orderNumber)) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError(503, 'ORDER_NUMBER_RETRY_EXHAUSTED', 'Could not create the order. Please retry.');
}

export async function listCustomerOrders(customerId) {
  const orders = await Order.find({ customerId }).sort({ createdAt: -1 }).limit(100);
  return orders.map(serializeOrder);
}

export async function getCustomerOrder(customerId, orderId) {
  const order = await Order.findOne({ _id: orderId, customerId });
  if (!order) throw ApiError.notFound('ORDER_NOT_FOUND', 'Order not found.');
  return serializeOrder(order);
}

export async function getOrderTimeline(customerId, orderId, { limit = 100 } = {}) {
  const order = await Order.findOne({ _id: orderId, customerId });
  if (!order) throw ApiError.notFound('ORDER_NOT_FOUND', 'Order not found.');

  try {
    const events = await getOrderEvents(order._id.toString(), limit);
    return {
      events,
      pendingEvents: order.eventOutbox.filter((event) => event.status === 'pending').length,
      timelineAvailable: true,
    };
  } catch (error) {
    logger.warn('Cassandra timeline temporarily unavailable', {
      orderId: order._id.toString(),
      error: error.message,
    });
    throw new ApiError(
      503,
      'TIMELINE_TEMPORARILY_UNAVAILABLE',
      'The order timeline is updating. Your order is safe; retry in a few seconds.',
    );
  }
}

export async function getCustomerOrderActivity(customerId, { limit = 30 } = {}) {
  try {
    return await getCustomerActivity(customerId, limit);
  } catch (error) {
    logger.warn('Cassandra customer activity temporarily unavailable', { error: error.message });
    throw new ApiError(
      503,
      'ACTIVITY_TEMPORARILY_UNAVAILABLE',
      'Order activity is temporarily unavailable. Try again in a few seconds.',
    );
  }
}

/**
 * Cancellation is a conditional single-document update. The status condition
 * and the state change are atomic, so a race with the status worker can only
 * produce one winning transition.
 */
export async function cancelCustomerOrder(customerId, orderId) {
  const existing = await Order.findOne({ _id: orderId, customerId });
  if (!existing) throw ApiError.notFound('ORDER_NOT_FOUND', 'Order not found.');

  const eventTimestamp = nextEventTimestamp(existing);
  const cancellationEvent = buildOutboxEvent({
    eventType: EVENT_TYPE.ORDER_CANCELLED,
    previousStatus: ORDER_STATUS.PENDING,
    newStatus: ORDER_STATUS.CANCELLED,
    description: STATUS_EVENT_DESCRIPTIONS[ORDER_STATUS.CANCELLED],
    activityDescription: `Order ${existing.orderNumber} was cancelled.`,
    eventTimestamp,
  });

  const order = await Order.findOneAndUpdate(
    { _id: orderId, customerId, status: ORDER_STATUS.PENDING },
    {
      $set: {
        status: ORDER_STATUS.CANCELLED,
        nextStatusAt: null,
        cancelledAt: eventTimestamp,
        updatedAt: new Date(),
      },
      $push: { eventOutbox: cancellationEvent },
    },
    { new: true },
  );

  if (!order) {
    throw ApiError.conflict(
      'ORDER_CANNOT_CANCEL',
      'This order has already moved beyond Pending and can no longer be cancelled.',
    );
  }

  logger.info('Order cancelled', { orderId: order._id.toString(), orderNumber: order.orderNumber });
  return serializeOrder(order);
}
