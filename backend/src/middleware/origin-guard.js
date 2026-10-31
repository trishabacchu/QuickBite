import config from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let allowedOrigin;

try {
  allowedOrigin = new URL(config.FRONTEND_ORIGIN).origin;
} catch {
  allowedOrigin = config.FRONTEND_ORIGIN;
}

/**
 * Defence in depth against CSRF. The auth cookie is HttpOnly and SameSite=Lax,
 * and browser state-changing requests must also originate from the configured
 * frontend origin. Requests without Origin/Referer (curl, server-to-server,
 * automated tests) are allowed; they cannot ride a victim's browser cookies.
 */
export function originGuard(req, _res, next) {
  if (!unsafeMethods.has(req.method)) return next();

  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    return next(ApiError.forbidden('Cross-site request blocked.'));
  }

  const origin = req.get('origin');
  if (origin && origin !== allowedOrigin) {
    return next(ApiError.forbidden('Request origin is not allowed.'));
  }

  if (!origin) {
    const referer = req.get('referer');
    if (referer) {
      try {
        if (new URL(referer).origin !== allowedOrigin) {
          return next(ApiError.forbidden('Request origin is not allowed.'));
        }
      } catch {
        return next(ApiError.forbidden('Request origin is not allowed.'));
      }
    }
  }

  return next();
}
