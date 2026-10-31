import { Router } from 'express';
import { addressRouter } from './address.routes.js';
import { authRouter } from './auth.routes.js';
import { cartRouter } from './cart.routes.js';
import { orderRouter } from './order.routes.js';
import { restaurantRouter } from './restaurant.routes.js';

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(restaurantRouter);
apiRouter.use(cartRouter);
apiRouter.use(addressRouter);
apiRouter.use(orderRouter);
