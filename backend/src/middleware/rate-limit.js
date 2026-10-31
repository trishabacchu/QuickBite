import { rateLimit } from 'express-rate-limit';
import config from '../config/env.js';

function limitedHandler(_req, res) {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please wait a few minutes and try again.',
      details: [],
    },
  });
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: limitedHandler,
});

export const sensitiveActionRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: limitedHandler,
});
