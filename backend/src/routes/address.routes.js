import { Router } from 'express';
import {
  getAddresses,
  patchAddress,
  postAddress,
  removeAddress,
} from '../controllers/address.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { addressBodySchema, addressUpdateSchema, idParamsSchema } from '../validators/schemas.js';

export const addressRouter = Router();

addressRouter.use('/addresses', requireCustomer);

addressRouter.get('/addresses', asyncHandler(getAddresses));
addressRouter.post('/addresses', validate(addressBodySchema), asyncHandler(postAddress));
addressRouter.patch(
  '/addresses/:id',
  validate(idParamsSchema, 'params'),
  validate(addressUpdateSchema),
  asyncHandler(patchAddress),
);
addressRouter.delete(
  '/addresses/:id',
  validate(idParamsSchema, 'params'),
  asyncHandler(removeAddress),
);
