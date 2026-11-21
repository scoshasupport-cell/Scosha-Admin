const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionId(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

function guestCookieOptions(maxAge = THIRTY_DAYS_MS) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge,
    path: '/',
    signed: true,
  };
}

function readSessionId(req) {
  const cookieName = env.GUEST_SESSION_COOKIE;
  const signed = req.signedCookies?.[cookieName];
  if (signed && signed !== false && isValidSessionId(signed)) {
    return String(signed).trim();
  }

  // Legacy unsigned cookie (migration window)
  const raw = req.cookies?.[cookieName];
  if (isValidSessionId(raw)) return String(raw).trim();

  // Fallback for browsers that block third-party cookies: client localStorage UUID
  const header = req.headers['x-guest-session-id'];
  if (isValidSessionId(header)) return String(header).trim();

  return null;
}

/**
 * Ensures a guest session UUID cookie exists for anonymous carts.
 * Skips cookie creation when the request is already authenticated.
 */
function ensureGuestSession(req, res, next) {
  const cookieName = env.GUEST_SESSION_COOKIE;

  if (req.user) {
    req.guestSessionId = null;
    return next();
  }

  let sessionId = readSessionId(req);

  if (!sessionId) {
    sessionId = uuidv4();
  }

  // Always refresh the cookie so cookie + header stay aligned for this browser.
  res.cookie(cookieName, sessionId, guestCookieOptions());

  req.guestSessionId = sessionId;
  return next();
}

/**
 * Reads guest session id without creating a new cookie.
 */
function readGuestSession(req, _res, next) {
  req.guestSessionId = readSessionId(req);
  next();
}

function clearGuestSession(res) {
  res.clearCookie(env.GUEST_SESSION_COOKIE, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
    signed: true,
  });
}

module.exports = {
  ensureGuestSession,
  readGuestSession,
  clearGuestSession,
  readSessionId,
  isValidSessionId,
};
