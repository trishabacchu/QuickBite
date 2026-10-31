import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { Customer } from '../models/Customer.js';
import { ApiError } from '../utils/api-error.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[config.AUTH_COOKIE_NAME];
    if (!token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET);
    } catch {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }

    if (!payload.sub || payload.role !== 'customer') throw ApiError.unauthorized();

    const customer = await Customer.findById(payload.sub);
    if (!customer) throw ApiError.unauthorized();

    // Password changes increment tokenVersion, invalidating old cookies even if
    // the JWT signature and expiry are still valid.
    if ((payload.ver ?? 0) !== (customer.tokenVersion ?? 0)) {
      throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
    }

    req.customer = customer;
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}

// The project has a single interactive role. Keeping a named customer guard
// makes authorization intent explicit at route declaration sites.
export const requireCustomer = requireAuth;
