const { prisma } = require('../config/prisma');
const { parseId, toOrderBy } = require('../utils/prismaHelpers');

async function create(data) {
  return prisma.category.create({ data });
}

async function findById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.category.findUnique({ where: { id: pk } });
}

async function findBySlug(slug) {
  return prisma.category.findUnique({ where: { slug } });
}

async function findOne(filter = {}) {
  return prisma.category.findFirst({ where: filter });
}

async function find(filter = {}, options = {}) {
  const { sort = { sortOrder: 1, name: 1 }, skip = 0, limit = 100 } = options;
  return prisma.category.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { sortOrder: 'asc' }),
    skip,
    take: limit,
  });
}

async function findAll(filter = {}, options = {}) {
  const { sort = { sortOrder: 1, name: 1 } } = options;
  return prisma.category.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { sortOrder: 'asc' }),
  });
}

async function count(filter = {}) {
  return prisma.category.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.category.update({ where: { id: pk }, data });
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.category.delete({ where: { id: pk } });
}

async function upsertBySlug(slug, data) {
  return prisma.category.upsert({
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
  findAll,
  count,
  updateById,
  deleteById,
  upsertBySlug,
};
