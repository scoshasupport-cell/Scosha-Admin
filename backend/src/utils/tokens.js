const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

/**
 * Missing `tv` matches version 0 so tokens issued before the column existed keep working
 * until logout, password change, or password reset bumps the stored version.
 */
function accessTokenVersionMatches(decoded, currentVersion) {
  const current = Number(currentVersion ?? 0);
  const claimed = decoded?.tv == null ? 0 : Number(decoded.tv);
  return Number.isInteger(current) && Number.isInteger(claimed) && claimed === current;
}

function generateAccessToken(payload, type = 'customer') {
  return jwt.sign({ ...payload, type }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

function generateRefreshToken(payload, type = 'customer') {
  // A unique id keeps two rotations in the same second from signing the same token.
  return jwt.sign({ ...payload, type, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

function tokenDigest(token) {
  // bcrypt only uses the first 72 bytes. JWTs share that prefix, so hash a digest.
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function hashToken(token) {
  return bcrypt.hash(tokenDigest(token), env.BCRYPT_SALT_ROUNDS);
}

async function compareToken(token, hash) {
  if (!token || !hash) return false;
  return bcrypt.compare(tokenDigest(token), hash);
}

function generateResetToken() {
  return crypto.randomUUID();
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setCustomerAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
}

function clearCookieOptions() {
  // Must match the non-expiry fields of cookieOptions(). Browsers keep the
  // cookie when path, Secure, or SameSite differ.
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  };
}

function clearCustomerAuthCookies(res) {
  const base = clearCookieOptions();
  res.clearCookie('accessToken', base);
  res.clearCookie('refreshToken', base);
}

function setAdminAuthCookies(res, accessToken, refreshToken) {
  res.cookie('adminAccessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('adminRefreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
}

function clearAdminAuthCookies(res) {
  const base = clearCookieOptions();
  res.clearCookie('adminAccessToken', base);
  res.clearCookie('adminRefreshToken', base);
}

module.exports = {
  accessTokenVersionMatches,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  generateResetToken,
  setCustomerAuthCookies,
  clearCustomerAuthCookies,
  setAdminAuthCookies,
  clearAdminAuthCookies,
};
