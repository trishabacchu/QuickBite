import { Router } from 'express';
import {
  getCategories,
  getFood,
  getRestaurant,
  getRestaurants,
  search,
} from '../controllers/restaurant.controller.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  idParamsSchema,
  restaurantListQuerySchema,
  searchQuerySchema,
} from '../validators/schemas.js';

export const restaurantRouter = Router();

restaurantRouter.get(
  '/restaurants',
  validate(restaurantListQuerySchema, 'query'),
  asyncHandler(getRestaurants),
);
restaurantRouter.get(
  '/restaurants/:id/menu',
  validate(idParamsSchema, 'params'),
  asyncHandler(getRestaurant),
);
restaurantRouter.get(
  '/restaurants/:id',
  validate(idParamsSchema, 'params'),
  asyncHandler(getRestaurant),
);
restaurantRouter.get(
  '/search',
  validate(searchQuerySchema, 'query'),
  asyncHandler(search),
);
restaurantRouter.get('/categories', asyncHandler(getCategories));
restaurantRouter.get('/food/:id', validate(idParamsSchema, 'params'), asyncHandler(getFood));
