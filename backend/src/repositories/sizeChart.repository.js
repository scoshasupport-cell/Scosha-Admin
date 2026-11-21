const { prisma } = require('../config/prisma');
const { parseId, toOrderBy } = require('../utils/prismaHelpers');

async function create(data) {
  return prisma.sizeChart.create({
    data,
    include: { brand: true },
  });
}

async function findById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.sizeChart.findUnique({
    where: { id: pk },
    include: { brand: true },
  });
}

async function findOne(filter = {}) {
  return prisma.sizeChart.findFirst({
    where: filter,
    include: { brand: true },
  });
}

async function find(filter = {}, options = {}) {
  const { sort = { updatedAt: -1 }, skip = 0, limit = 50 } = options;
  return prisma.sizeChart.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { updatedAt: 'desc' }),
    skip,
    take: limit,
    include: { brand: true },
  });
}

async function count(filter = {}) {
  return prisma.sizeChart.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.sizeChart.update({
    where: { id: pk },
    data,
    include: { brand: true },
  });
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.sizeChart.delete({ where: { id: pk } });
}

module.exports = {
  create,
  findById,
  findOne,
  find,
  count,
  updateById,
  deleteById,
};
