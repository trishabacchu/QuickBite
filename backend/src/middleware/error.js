import { ZodError } from 'zod';
import config from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, _res, next) {
  next(
    ApiError.notFound(
      'ROUTE_NOT_FOUND',
      `The requested route ${req.method} ${req.originalUrl} does not exist.`,
    ),
  );
}

function sendError(res, status, code, message, details = []) {
  return res.status(status).json({ error: { code, message, details } });
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return;

  if (error instanceof ApiError) {
    return sendError(res, error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields.',
      error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  if (error?.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'The request body is not valid JSON.');
  }
  if (error?.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }

  if (error?.name === 'CastError') {
    return sendError(res, 400, 'INVALID_ID', 'The request contains an invalid identifier.');
  }

  if (error?.name === 'ValidationError' && error.errors) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields.',
      Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    );
  }

  if (error?.code === 11000) {
    if (error.keyPattern?.email) {
      return sendError(
        res,
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists. Try signing in instead.',
      );
    }
    return sendError(res, 409, 'DUPLICATE_RECORD', 'A record with those details already exists.');
  }

  if (error?.message === 'Not allowed by CORS') {
    return sendError(res, 403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.');
  }

  logger.error('Unhandled API error', {
    method: req.method,
    path: req.originalUrl,
    error: error?.message,
    stack: config.NODE_ENV === 'development' ? error?.stack : undefined,
  });

  // Never expose internal database errors or stack traces to clients.
  return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
