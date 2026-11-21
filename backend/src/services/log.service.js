const { prisma } = require('../config/prisma');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');

function mapAdmin(admin) {
  if (!admin) return admin;
  return { _id: admin.id, id: admin.id, name: admin.name, email: admin.email };
}

function mapUser(user) {
  if (!user) return user;
  return { _id: user.id, id: user.id, name: user.name, email: user.email };
}

async function listAuditLogs(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = {};
  if (query.adminId) where.adminId = Number(query.adminId);
  if (query.entity) where.entity = query.entity;
  if (query.action) where.action = query.action;
  if (query.q) {
    where.OR = [
      { action: { contains: query.q } },
      { entity: { contains: query.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { admin: { select: { id: true, name: true, email: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const data = rows.map((row) => {
    const { admin, ...rest } = row;
    return {
      ...rest,
      adminId: admin ? mapAdmin(admin) : rest.adminId,
    };
  });

  return paginatedResponse(data, total, page, limit);
}

async function listActivityLogs(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = {};
  if (query.userId) where.userId = Number(query.userId);
  if (query.action) where.action = query.action;
  if (query.q) where.action = { contains: query.q };

  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  const data = rows.map((row) => {
    const { user, ...rest } = row;
    return {
      ...rest,
      userId: user ? mapUser(user) : rest.userId,
    };
  });

  return paginatedResponse(data, total, page, limit);
}

module.exports = { listAuditLogs, listActivityLogs };
