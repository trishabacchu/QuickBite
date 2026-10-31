import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants/security.js';
import { objectIdSchema } from '../utils/ids.js';

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Password is required.').max(PASSWORD_MAX_LENGTH),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine(
      (value) => value === '' || /^\+?[0-9 ()-]{7,20}$/.test(value),
      'Enter a valid phone number, or leave it blank.',
    )
    .optional()
    .default(''),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
});

export const addressBodySchema = z.object({
  label: z.string().trim().max(30).optional().default(''),
  line1: z.string().trim().min(5, 'Address line is too short.').max(200),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit Indian postal code.'),
});

export const addressUpdateSchema = addressBodySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Provide at least one field to update.',
);

export const addCartItemSchema = z.object({
  foodItemId: objectIdSchema,
  quantity: z.number().int().min(1).max(10).optional().default(1),
  replaceCart: z.boolean().optional().default(false),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number({ error: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .min(1, 'Quantity must be at least 1.')
    .max(10, 'Quantity cannot exceed 10.'),
});

export const createOrderSchema = z.object({
  addressId: objectIdSchema,
  paymentMethod: z.literal('COD', {
    error: 'This demo supports Cash on Delivery only.',
  }),
});

export const idParamsSchema = z.object({ id: objectIdSchema });
export const cartItemParamsSchema = z.object({ itemId: objectIdSchema });

export const restaurantListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Enter a search term.').max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
