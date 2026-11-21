const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

async function listPublic() {
  return prisma.homepageSection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, 'sortOrder'));
  const where = {};
  if (query.type) where.type = query.type;
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const [data, total] = await Promise.all([
    prisma.homepageSection.findMany({ where, orderBy, skip, take: limit }),
    prisma.homepageSection.count({ where }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

async function getById(id) {
  const section = await prisma.homepageSection.findUnique({ where: { id: Number(id) } });
  if (!section) throw ApiError.notFound('Homepage section not found');
  return section;
}

async function create(payload, adminId, req) {
  if (payload.type) {
    const existing = await prisma.homepageSection.findUnique({ where: { type: payload.type } });
    if (existing) throw ApiError.conflict(`Homepage section type "${payload.type}" already exists`);
  }

  const section = await prisma.homepageSection.create({ data: payload });
  await logAdminAction(adminId, 'create', 'HomepageSection', section.id, null, section, req);
  return section;
}

async function update(id, payload, adminId, req) {
  const section = await prisma.homepageSection.findUnique({ where: { id: Number(id) } });
  if (!section) throw ApiError.notFound('Homepage section not found');

  if (payload.type && payload.type !== section.type) {
    const existing = await prisma.homepageSection.findUnique({ where: { type: payload.type } });
    if (existing) throw ApiError.conflict(`Homepage section type "${payload.type}" already exists`);
  }

  const before = { ...section };
  const updated = await prisma.homepageSection.update({
    where: { id: section.id },
    data: payload,
  });
  await logAdminAction(adminId, 'update', 'HomepageSection', section.id, before, updated, req);
  return updated;
}

async function remove(id, adminId, req) {
  const section = await prisma.homepageSection.findUnique({ where: { id: Number(id) } });
  if (!section) throw ApiError.notFound('Homepage section not found');
  const before = { ...section };
  await prisma.homepageSection.delete({ where: { id: section.id } });
  await logAdminAction(adminId, 'delete', 'HomepageSection', id, before, null, req);
  return { deleted: true, id: section.id };
}

module.exports = { listPublic, listAdmin, getById, create, update, remove };
