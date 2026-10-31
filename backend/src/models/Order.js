import mongoose from 'mongoose';
import {
  EVENT_TYPE,
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from '../constants/order.js';

const orderItemSchema = new mongoose.Schema(
  {
    foodItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
    unitPricePaise: { type: Number, required: true, min: 1, integer: true },
    quantity: { type: Number, required: true, min: 1, max: 10, integer: true },
    lineTotalPaise: { type: Number, required: true, min: 1, integer: true },
  },
  { _id: false },
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  { _id: false },
);

const restaurantSnapshotSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    cuisine: { type: String, required: true },
    imageUrl: { type: String, required: true },
  },
  { _id: false },
);

/**
 * Pending Cassandra events are embedded in the order document. This makes the
 * order state change and the event intent a single atomic MongoDB write,
 * without needing a multi-document transaction on a standalone Docker setup.
 */
const outboxEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    eventType: {
      type: String,
      required: true,
      enum: Object.values(EVENT_TYPE),
    },
    previousStatus: {
      type: String,
      default: null,
      enum: [...ORDER_STATUS_VALUES, null],
    },
    newStatus: {
      type: String,
      required: true,
      enum: ORDER_STATUS_VALUES,
    },
    description: { type: String, required: true },
    activityDescription: { type: String, required: true },
    eventTimestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'delivered'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, required: true },
    lastError: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    restaurantSnapshot: { type: restaurantSnapshotSchema, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'An order must contain at least one item.',
      },
    },
    subtotalPaise: { type: Number, required: true, min: 1, integer: true },
    deliveryFeePaise: { type: Number, required: true, min: 0, integer: true },
    totalPaise: { type: Number, required: true, min: 1, integer: true },
    deliveryAddressSnapshot: { type: addressSnapshotSchema, required: true },
    paymentMethod: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_METHOD),
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUS_VALUES,
      default: ORDER_STATUS.PENDING,
    },
    estimatedDeliveryMinutes: { type: Number, required: true, min: 1 },
    nextStatusAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    eventOutbox: { type: [outboxEventSchema], default: [] },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, nextStatusAt: 1 });
orderSchema.index({ 'eventOutbox.status': 1, 'eventOutbox.nextAttemptAt': 1 });

export const Order = mongoose.model('Order', orderSchema);
