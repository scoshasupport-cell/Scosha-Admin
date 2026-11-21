const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const { accessTokenVersionMatches } = require('../utils/tokens');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { USER_STATUS, ROLE_SUPER_ADMIN } = require('../constants/commerce');

function extractBearerToken(req, cookieName = 'accessToken') {
  // Prefer explicit Authorization header so localStorage tokens win over a
  // stale httpOnly cookie from a previous account on the same browser.
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }

  if (req.cookies?.[cookieName]) {
    return req.cookies[cookieName];
  }

  return null;
}

function mapAdminRole(admin) {
  if (!admin?.role) return admin;
  return {
    ...admin,
    roleId: {
      name: admin.role.name,
      isSystem: admin.role.isSystem,
      permissions: (admin.role.permissions || []).map((rp) => rp.permission),
    },
  };
}

const authenticateCustomer = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req, 'accessToken');

  if (!token) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'customer') {
      return next(ApiError.unauthorized('Invalid token type'));
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: {
        id: true,
        email: true,
        status: true,
        tokenVersion: true,
        role: { select: { name: true } },
      },
    });

    if (!user || user.status !== USER_STATUS.ACTIVE) {
      return next(ApiError.unauthorized('Account not found or inactive'));
    }

    if (!accessTokenVersionMatches(decoded, user.tokenVersion)) {
      return next(ApiError.unauthorized('Session revoked'));
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      role: user.role?.name || decoded.role,
    };
    return next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
});

function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req, 'accessToken');
  if (!token) return next();

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    return next();
  }

  if (decoded.type !== 'customer') return next();
  const id = Number(decoded.id);
  if (!Number.isInteger(id) || id <= 0) return next();

  prisma.user
    .findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        tokenVersion: true,
        role: { select: { name: true } },
      },
    })
    .then((user) => {
      if (
        user &&
        user.status === USER_STATUS.ACTIVE &&
        accessTokenVersionMatches(decoded, user.tokenVersion)
      ) {
        req.user = {
          id: Number(user.id),
          email: user.email,
          role: user.role?.name || decoded.role,
        };
      }
      next();
    })
    .catch(next);
}

const authenticateAdmin = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req, 'adminAccessToken');

  if (!token) {
    return next(ApiError.unauthorized('Admin authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'admin') {
      return next(ApiError.unauthorized('Invalid token type'));
    }

    const admin = await prisma.admin.findUnique({
      where: { id: Number(decoded.id) },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!admin || admin.status === 'banned') {
      return next(ApiError.unauthorized('Admin account not found or inactive'));
    }

    if (!accessTokenVersionMatches(decoded, admin.tokenVersion)) {
      return next(ApiError.unauthorized('Session revoked'));
    }

    const mapped = mapAdminRole(admin);
    // Compat: controllers historically used req.admin._id (Mongo); Prisma uses id
    req.admin = { ...mapped, _id: mapped.id };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }
    return next(error);
  }
});

const requireEmailVerified = asyncHandler(async (req, _res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user.id) },
  });

  if (!user) {
    return next(ApiError.unauthorized('User not found'));
  }

  if (!user.isEmailVerified && !(user.phone && !user.email)) {
    return next(ApiError.forbidden('Email verification required', null, 'EMAIL_NOT_VERIFIED'));
  }

  req.userDoc = user;
  return next();
});

function requirePermission(moduleName, action) {
  return (req, _res, next) => {
    const role = req.admin?.roleId;
    if (!role) return next(ApiError.forbidden('No role assigned'));

    if (role.name === ROLE_SUPER_ADMIN) {
      return next();
    }

    const permissions = role.permissions || [];
    const hasPermission = permissions.some(
      (permission) =>
        permission &&
        permission.module === moduleName &&
        permission.action === action
    );

    if (!hasPermission) {
      return next(ApiError.forbidden(`Permission denied: ${moduleName}.${action}`));
    }

    return next();
  };
}

module.exports = {
  authenticateCustomer,
  optionalAuth,
  authenticateAdmin,
  requireEmailVerified,
  requirePermission,
  extractBearerToken,
};
