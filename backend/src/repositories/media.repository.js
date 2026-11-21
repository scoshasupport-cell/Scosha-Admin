const { prisma } = require('../config/prisma');
const { parseId, toOrderBy } = require('../utils/prismaHelpers');

async function create(data) {
  return prisma.media.create({ data });
}

async function createMany(docs) {
  if (!docs?.length) return [];
  // createMany does not return rows on MySQL; create sequentially for callers that need ids
  const created = [];
  for (const doc of docs) {
    created.push(await prisma.media.create({ data: doc }));
  }
  return created;
}

async function findById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.media.findUnique({ where: { id: pk } });
}

async function findOne(filter = {}) {
  return prisma.media.findFirst({ where: filter });
}

async function findByPublicId(publicId) {
  return prisma.media.findFirst({ where: { publicId } });
}

async function find(filter = {}, options = {}) {
  const { sort = { createdAt: -1 }, skip = 0, limit = 50 } = options;
  return prisma.media.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { createdAt: 'desc' }),
    skip,
    take: limit,
  });
}

async function count(filter = {}) {
  return prisma.media.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.media.update({ where: { id: pk }, data });
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.media.delete({ where: { id: pk } });
}

async function deleteByPublicId(publicId) {
  const existing = await findByPublicId(publicId);
  if (!existing) return null;
  return prisma.media.delete({ where: { id: existing.id } });
}

module.exports = {
  create,
  createMany,
  findById,
  findOne,
  findByPublicId,
  find,
  count,
  updateById,
  deleteById,
  deleteByPublicId,
};
