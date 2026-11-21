const bcrypt = require('bcryptjs');
const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
} = require('../utils/tokens');

const adminRoleInclude = {
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
};

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

function sanitizeAdmin(admin) {
  const obj = { ...admin };
  if (obj.id != null) obj.id = String(obj.id);
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.tokenVersion;
  return obj;
}

async function issueAdminTokens(admin, { expectedRefreshHash } = {}) {
  const adminId = Number(admin.id);
  let tokenVersion = admin.tokenVersion;
  if (tokenVersion == null) {
    const row = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { tokenVersion: true },
    });
    if (!row) throw ApiError.unauthorized('Admin not found');
    tokenVersion = row.tokenVersion;
  }
  const mapped = mapAdminRole(admin);
  const payload = {
    id: String(adminId),
    email: admin.email,
    role: mapped.roleId?.name || 'admin',
    tv: tokenVersion,
  };
  const accessToken = generateAccessToken(payload, 'admin');
  const refreshToken = generateRefreshToken(payload, 'admin');
  const refreshTokenHash = await hashToken(refreshToken);
  const lastLogin = new Date();

  const where = { id: adminId, tokenVersion };
  if (expectedRefreshHash) where.refreshTokenHash = expectedRefreshHash;
  const wrote = await prisma.admin.updateMany({
    where,
    data: { refreshTokenHash, lastLogin },
  });
  if (wrote.count !== 1) throw ApiError.unauthorized('Session revoked');

  const updated = { refreshTokenHash, lastLogin, tokenVersion };

  return {
    accessToken,
    refreshToken,
    admin: sanitizeAdmin(mapAdminRole({ ...admin, ...updated, role: admin.role })),
  };
}

async function login({ email, password }) {
  const admin = await prisma.admin.findUnique({
    where: { email: email.toLowerCase() },
    include: adminRoleInclude,
  });

  if (!admin) throw ApiError.unauthorized('Invalid email or password');
  if (admin.status === 'banned') throw ApiError.forbidden('Admin account is banned');

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  return issueAdminTokens(admin);
}

async function refresh(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  if (decoded.type !== 'admin') throw ApiError.unauthorized('Invalid token type');

  const admin = await prisma.admin.findUnique({
    where: { id: Number(decoded.id) },
    include: adminRoleInclude,
  });

  if (!admin || admin.status === 'banned') throw ApiError.unauthorized('Admin not found');

  const match = await compareToken(refreshToken, admin.refreshTokenHash);
  if (!match) throw ApiError.unauthorized('Refresh token revoked');

  return issueAdminTokens(admin, { expectedRefreshHash: admin.refreshTokenHash });
}

async function logout(adminId) {
  await prisma.admin.update({
    where: { id: Number(adminId) },
    data: { refreshTokenHash: null, tokenVersion: { increment: 1 } },
  });
  return { message: 'Logged out' };
}

async function getMe(adminId) {
  const admin = await prisma.admin.findUnique({
    where: { id: Number(adminId) },
    include: adminRoleInclude,
  });
  if (!admin) throw ApiError.notFound('Admin not found');
  return sanitizeAdmin(mapAdminRole(admin));
}

async function changePassword(adminId, { currentPassword, newPassword }) {
  const admin = await prisma.admin.findUnique({
    where: { id: Number(adminId) },
    select: {
      id: true,
      passwordHash: true,
    },
  });
  if (!admin) throw ApiError.notFound('Admin not found');

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS),
      refreshTokenHash: null,
      tokenVersion: { increment: 1 },
    },
  });

  return { message: 'Password changed successfully' };
}

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  mapAdminRole,
};
