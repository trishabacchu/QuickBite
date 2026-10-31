import { Router } from 'express';
import {
  getProfile,
  login,
  logout,
  me,
  register,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter, sensitiveActionRateLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();

authRouter.post('/auth/register', authRateLimiter, validate(registerSchema), asyncHandler(register));
authRouter.post('/auth/login', authRateLimiter, validate(loginSchema), asyncHandler(login));
authRouter.post('/auth/logout', asyncHandler(logout));
authRouter.get('/auth/me', requireAuth, asyncHandler(me));

authRouter.get('/profile', requireAuth, asyncHandler(getProfile));
authRouter.patch(
  '/profile',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(updateProfile),
);
authRouter.post(
  '/profile/change-password',
  requireAuth,
  sensitiveActionRateLimiter,
  validate(changePasswordSchema),
  asyncHandler(changePassword),
);
