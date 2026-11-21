const { prisma } = require('../config/prisma');
const { parseId, toOrderBy } = require('../utils/prismaHelpers');

async function create(data) {
  return prisma.brand.create({ data });
}

async function findById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.brand.findUnique({ where: { id: pk } });
}

async function findBySlug(slug) {
  return prisma.brand.findUnique({ where: { slug } });
}

async function findOne(filter = {}) {
  return prisma.brand.findFirst({ where: filter });
}

async function find(filter = {}, options = {}) {
  const { sort = { sortOrder: 1, name: 1 }, skip = 0, limit = 12 } = options;
  return prisma.brand.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { sortOrder: 'asc' }),
    skip,
    take: limit,
  });
}

async function count(filter = {}) {
  return prisma.brand.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.brand.update({ where: { id: pk }, data });
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.brand.delete({ where: { id: pk } });
}

async function upsertBySlug(slug, data) {
  return prisma.brand.upsert({
    where: { slug },
    create: { ...data, slug },
    update: { ...data, slug },
  });
}

module.exports = {
  create,
  findById,
  findBySlug,
  findOne,
  find,
  count,
  updateById,
  deleteById,
  upsertBySlug,
};
