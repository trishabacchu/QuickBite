import { Router } from 'express';
import {
  cancelOrder,
  getActivity,
  getOrder,
  getOrderEvents,
  getOrders,
  postOrder,
} from '../controllers/order.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  activityQuerySchema,
  createOrderSchema,
  eventsQuerySchema,
  idParamsSchema,
} from '../validators/schemas.js';

export const orderRouter = Router();

orderRouter.use('/orders', requireCustomer);

orderRouter.get(
  '/orders/activity',
  validate(activityQuerySchema, 'query'),
  asyncHandler(getActivity),
);
orderRouter.get('/orders', asyncHandler(getOrders));
orderRouter.post('/orders', validate(createOrderSchema), asyncHandler(postOrder));
orderRouter.get('/orders/:id', validate(idParamsSchema, 'params'), asyncHandler(getOrder));
orderRouter.get(
  '/orders/:id/events',
  validate(idParamsSchema, 'params'),
  validate(eventsQuerySchema, 'query'),
  asyncHandler(getOrderEvents),
);
orderRouter.post(
  '/orders/:id/cancel',
  validate(idParamsSchema, 'params'),
  asyncHandler(cancelOrder),
);
