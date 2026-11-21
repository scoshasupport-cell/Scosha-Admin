const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SESSION_COOKIES = [
  'accessToken',
  'refreshToken',
  'adminAccessToken',
  'adminRefreshToken',
];

function isDevLoopback(value) {
  if (env.isProd) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function allowedOrigin(value) {
  if (!value || value === 'null') return false;
  if (env.corsOrigins.includes(value)) return true;
  return isDevLoopback(value);
}

function refererOrigin(req) {
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function hasSessionCookie(req) {
  const cookies = req.cookies || {};
  if (SESSION_COOKIES.some((name) => cookies[name])) return true;
  const guest = env.GUEST_SESSION_COOKIE;
  return Boolean(cookies[guest] || req.signedCookies?.[guest]);
}

function reject(next) {
  return next(ApiError.forbidden('Cross-site request blocked', null, 'CSRF_REJECTED'));
}

/**
 * Cookie-authenticated unsafe requests must come from an allowlisted Origin
 * (or a Referer on that allowlist when Origin is absent).
 * A Bearer token is not set by a cross-site HTML form, so those clients pass.
 * Requests with no session cookie and no Origin stay open for non-browser clients.
 * CORS is not this check.
 */
function csrfGuard(req, _res, next) {
  if (!UNSAFE.has(req.method)) return next();

  const authorization = req.get('authorization') || '';
  if (/^Bearer\s+\S+/.test(authorization)) return next();

  const origin = req.get('origin');
  if (origin) {
    return allowedOrigin(origin) ? next() : reject(next);
  }

  const fromReferer = refererOrigin(req);
  if (fromReferer) {
    return allowedOrigin(fromReferer) ? next() : reject(next);
  }

  if (hasSessionCookie(req)) return reject(next);
  return next();
}

module.exports = { csrfGuard, allowedOrigin };
