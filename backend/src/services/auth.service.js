import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { BCRYPT_ROUNDS } from '../constants/security.js';
import { Customer } from '../models/Customer.js';
import { ApiError } from '../utils/api-error.js';
import { durationToMilliseconds } from '../utils/duration.js';

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(customer) {
  return jwt.sign(
    {
      sub: customer._id.toString(),
      ver: customer.tokenVersion ?? 0,
      role: 'customer',
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: '/',
    maxAge: durationToMilliseconds(config.JWT_EXPIRES_IN),
  };
}

export function setAuthCookie(res, token) {
  res.cookie(config.AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res) {
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(config.AUTH_COOKIE_NAME, options);
}

export async function registerCustomer({ name, email, password }) {
  const passwordHash = await hashPassword(password);
  try {
    return await Customer.create({
      name: name.trim(),
      email: normalizeEmail(email),
      passwordHash,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict(
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists. Try signing in instead.',
      );
    }
    throw error;
  }
}

export async function authenticateCustomer({ email, password }) {
  const customer = await Customer.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  return customer;
}

export async function updateCustomerProfile(customerId, { name, phone }) {
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $set: { name: name.trim(), phone: phone?.trim() || '' } },
    { new: true, runValidators: true },
  );
  if (!customer) throw ApiError.unauthorized();
  return customer;
}

export async function changeCustomerPassword(customerId, { currentPassword, newPassword }) {
  const customer = await Customer.findById(customerId).select('+passwordHash');
  if (!customer) throw ApiError.unauthorized();

  if (!(await verifyPassword(currentPassword, customer.passwordHash))) {
    throw ApiError.badRequest('CURRENT_PASSWORD_INCORRECT', 'The current password is incorrect.');
  }

  customer.passwordHash = await hashPassword(newPassword);
  // Every JWT carries this version. Incrementing it invalidates all old tokens.
  customer.tokenVersion += 1;
  await customer.save();
  return customer;
}
