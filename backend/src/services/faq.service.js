const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

async function listPublic(query = {}) {
  const where = { status: 'active' };
  if (query.category) where.category = query.category;
  return prisma.fAQ.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, 'sortOrder'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.q) {
    where.OR = [
      { question: { contains: query.q } },
      { answer: { contains: query.q } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.fAQ.findMany({ where, orderBy, skip, take: limit }),
    prisma.fAQ.count({ where }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

async function getById(id) {
  const faq = await prisma.fAQ.findUnique({ where: { id: Number(id) } });
  if (!faq) throw ApiError.notFound('FAQ not found');
  return faq;
}

async function create(payload, adminId, req) {
  const faq = await prisma.fAQ.create({ data: payload });
  await logAdminAction(adminId, 'create', 'FAQ', faq.id, null, faq, req);
  return faq;
}

async function update(id, payload, adminId, req) {
  const faq = await prisma.fAQ.findUnique({ where: { id: Number(id) } });
  if (!faq) throw ApiError.notFound('FAQ not found');
  const before = { ...faq };
  const updated = await prisma.fAQ.update({
    where: { id: faq.id },
    data: payload,
  });
  await logAdminAction(adminId, 'update', 'FAQ', faq.id, before, updated, req);
  return updated;
}

async function remove(id, adminId, req) {
  const faq = await prisma.fAQ.findUnique({ where: { id: Number(id) } });
  if (!faq) throw ApiError.notFound('FAQ not found');
  const before = { ...faq };
  await prisma.fAQ.delete({ where: { id: faq.id } });
  await logAdminAction(adminId, 'delete', 'FAQ', id, before, null, req);
  return { deleted: true, id: faq.id };
}

module.exports = { listPublic, listAdmin, getById, create, update, remove };
