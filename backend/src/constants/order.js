export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

// The simulated delivery lifecycle. CANCELLED is only reachable from PENDING.
export const ORDER_STATUS_SEQUENCE = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

export const NEXT_ORDER_STATUS = Object.freeze({
  [ORDER_STATUS.PENDING]: ORDER_STATUS.CONFIRMED,
  [ORDER_STATUS.CONFIRMED]: ORDER_STATUS.PREPARING,
  [ORDER_STATUS.PREPARING]: ORDER_STATUS.READY_FOR_PICKUP,
  [ORDER_STATUS.READY_FOR_PICKUP]: ORDER_STATUS.OUT_FOR_DELIVERY,
  [ORDER_STATUS.OUT_FOR_DELIVERY]: ORDER_STATUS.DELIVERED,
});

export const TERMINAL_ORDER_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

export const PAYMENT_METHOD = Object.freeze({
  COD: 'COD',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
});

export const EVENT_TYPE = Object.freeze({
  ORDER_PLACED: 'ORDER_PLACED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
});

export const STATUS_EVENT_DESCRIPTIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: 'Order placed and waiting for restaurant confirmation.',
  [ORDER_STATUS.CONFIRMED]: 'Restaurant confirmed your order.',
  [ORDER_STATUS.PREPARING]: 'The kitchen is preparing your food.',
  [ORDER_STATUS.READY_FOR_PICKUP]: 'Your order is ready for pickup by the delivery partner.',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Your order is on the way.',
  [ORDER_STATUS.DELIVERED]:
    'Order delivered. The demo keeps Cash on Delivery payment status as PENDING because no payment is collected.',
  [ORDER_STATUS.CANCELLED]: 'Order cancelled by the customer.',
});

export const ORDER_STATUS_LABELS = Object.freeze({
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.PREPARING]: 'Preparing',
  [ORDER_STATUS.READY_FOR_PICKUP]: 'Ready for pickup',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Out for delivery',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
});
