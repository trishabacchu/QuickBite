import mongoose from 'mongoose';
import { z } from 'zod';
import { ApiError } from './api-error.js';

export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => mongoose.isValidObjectId(value), 'Invalid identifier.');

export function assertObjectId(value, fieldName = 'id') {
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest('INVALID_ID', `The ${fieldName} is not a valid identifier.`);
  }
}
