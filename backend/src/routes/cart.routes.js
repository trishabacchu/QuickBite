import { Router } from 'express';
import {
  addCartItem,
  clearCart,
  deleteCartItem,
  getCart,
  updateCartItem,
} from '../controllers/cart.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  addCartItemSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from '../validators/schemas.js';

export const cartRouter = Router();

// Scope the guard to this router's paths. Mounting it with no path would also
// run for unrelated requests that fall through to this router.
cartRouter.use('/cart', requireCustomer);

cartRouter.get('/cart', asyncHandler(getCart));
cartRouter.post('/cart/items', validate(addCartItemSchema), asyncHandler(addCartItem));
cartRouter.patch(
  '/cart/items/:itemId',
  validate(cartItemParamsSchema, 'params'),
  validate(updateCartItemSchema),
  asyncHandler(updateCartItem),
);
cartRouter.delete(
  '/cart/items/:itemId',
  validate(cartItemParamsSchema, 'params'),
  asyncHandler(deleteCartItem),
);
cartRouter.delete('/cart', asyncHandler(clearCart));
