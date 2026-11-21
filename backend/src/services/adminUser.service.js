const bcrypt = require('bcryptjs');
const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

const adminRoleInclude = {
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
};

function mapAdmin(admin) {
  if (!admin) return admin;
  const { role, passwordHash, refreshTokenHash, ...rest } = admin;
  const mapped = {
    ...rest,
    id: rest.id,
  };
  if (role) {
    mapped.roleId = {
      _id: role.id,
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      permissions: (role.permissions || []).map((rp) => rp.permission),
    };
  }
  return mapped;
}

function sanitize(admin) {
  const obj = mapAdmin(admin);
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.tokenVersion;
  return obj;
}

async function list(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { email: { contains: query.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      include: adminRoleInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.admin.count({ where }),
  ]);

  return paginatedResponse(rows.map((a) => sanitize(a)), total, page, limit);
}

async function getById(id) {
  const admin = await prisma.admin.findUnique({
    where: { id: Number(id) },
    include: adminRoleInclude,
  });
  if (!admin) throw ApiError.notFound('Admin not found');
  return sanitize(admin);
}

async function create(payload, actorId, req) {
  const email = payload.email.toLowerCase();
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Admin email already exists');

  const role = await prisma.role.findUnique({ where: { id: Number(payload.roleId) } });
  if (!role) throw ApiError.badRequest('Invalid roleId');

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);
  const admin = await prisma.admin.create({
    data: {
      name: payload.name,
      email,
      passwordHash,
      roleId: Number(payload.roleId),
      status: payload.status || 'active',
      avatar: payload.avatar,
    },
  });

  const full = await getById(admin.id);
  await logAdminAction(actorId, 'create', 'Admin', admin.id, null, full, req);
  return full;
}

async function update(id, payload, actorId, req) {
  const admin = await prisma.admin.findUnique({ where: { id: Number(id) } });
  if (!admin) throw ApiError.notFound('Admin not found');

  const before = sanitize(admin);
  const data = {};

  if (payload.email && payload.email.toLowerCase() !== admin.email) {
    const existing = await prisma.admin.findUnique({
      where: { email: payload.email.toLowerCase() },
    });
    if (existing) throw ApiError.conflict('Admin email already exists');
    data.email = payload.email.toLowerCase();
  }
  if (payload.name) data.name = payload.name;
  if (payload.status) data.status = payload.status;
  if (payload.avatar !== undefined) data.avatar = payload.avatar;
  if (payload.roleId) {
    const role = await prisma.role.findUnique({ where: { id: Number(payload.roleId) } });
    if (!role) throw ApiError.badRequest('Invalid roleId');
    data.roleId = Number(payload.roleId);
  }
  if (payload.password) {
    data.passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);
  }
  // A password set or a ban must not leave the previous session usable.
  // Unban does not restore it: the version was already incremented.
  const revokeSession =
    Boolean(payload.password) || (payload.status === 'banned' && admin.status !== 'banned');
  if (revokeSession) {
    data.refreshTokenHash = null;
    data.tokenVersion = { increment: 1 };
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data,
  });

  const after = await getById(admin.id);
  await logAdminAction(actorId, 'update', 'Admin', admin.id, before, after, req);
  return after;
}

async function remove(id, actorId, req) {
  if (String(id) === String(actorId)) {
    throw ApiError.badRequest('Cannot delete your own admin account');
  }
  const admin = await prisma.admin.findUnique({ where: { id: Number(id) } });
  if (!admin) throw ApiError.notFound('Admin not found');
  const before = sanitize(admin);
  await prisma.admin.delete({ where: { id: admin.id } });
  await logAdminAction(actorId, 'delete', 'Admin', id, before, null, req);
  return { deleted: true, id: admin.id };
}

module.exports = { list, getById, create, update, remove };
