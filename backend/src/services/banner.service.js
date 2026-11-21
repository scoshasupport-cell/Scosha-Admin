const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

async function listPublic(query = {}) {
  const now = new Date();
  const where = {
    status: 'active',
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
  if (query.position) where.position = query.position;

  return prisma.banner.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, 'sortOrder'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.position) where.position = query.position;
  if (query.q) where.title = { contains: query.q };

  const [data, total] = await Promise.all([
    prisma.banner.findMany({ where, orderBy, skip, take: limit }),
    prisma.banner.count({ where }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

async function getById(id) {
  const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!banner) throw ApiError.notFound('Banner not found');
  return banner;
}

async function create(payload, adminId, req) {
  const banner = await prisma.banner.create({ data: payload });
  await logAdminAction(adminId, 'create', 'Banner', banner.id, null, banner, req);
  return banner;
}

async function update(id, payload, adminId, req) {
  const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!banner) throw ApiError.notFound('Banner not found');
  const before = { ...banner };
  const updated = await prisma.banner.update({
    where: { id: banner.id },
    data: payload,
  });
  await logAdminAction(adminId, 'update', 'Banner', banner.id, before, updated, req);
  return updated;
}

async function remove(id, adminId, req) {
  const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!banner) throw ApiError.notFound('Banner not found');
  const before = { ...banner };
  await prisma.banner.delete({ where: { id: banner.id } });
  await logAdminAction(adminId, 'delete', 'Banner', id, before, null, req);
  return { deleted: true, id: banner.id };
}

module.exports = { listPublic, listAdmin, getById, create, update, remove };
