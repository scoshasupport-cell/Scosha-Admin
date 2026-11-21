const { prisma } = require('../config/prisma');
const { parseId, toOrderBy, mapVariant, mapProduct } = require('../utils/prismaHelpers');

async function create(data) {
  const variant = await prisma.productVariant.create({ data });
  return mapVariant(variant);
}

async function createMany(docs) {
  if (!docs?.length) return [];
  await prisma.productVariant.createMany({ data: docs, skipDuplicates: true });
  const skus = docs.map((d) => d.sku).filter(Boolean);
  const created = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
  });
  return created.map(mapVariant);
}

async function findById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  const variant = await prisma.productVariant.findUnique({ where: { id: pk } });
  return mapVariant(variant);
}

async function findOne(filter = {}) {
  const variant = await prisma.productVariant.findFirst({ where: filter });
  return mapVariant(variant);
}

async function findBySku(sku) {
  const variant = await prisma.productVariant.findUnique({ where: { sku } });
  return mapVariant(variant);
}

async function findByProduct(productId, options = {}) {
  const pk = parseId(productId);
  if (!pk) return [];
  const { sort = { colorName: 1, size: 1 }, status } = options;
  const filter = { productId: pk };
  if (status) filter.status = status;
  const rows = await prisma.productVariant.findMany({
    where: filter,
    orderBy: toOrderBy(sort, [{ colorName: 'asc' }, { size: 'asc' }]),
  });
  return rows.map(mapVariant);
}

async function find(filter = {}, options = {}) {
  const { sort = { updatedAt: -1 }, skip = 0, limit = 50, populate } = options;
  const rows = await prisma.productVariant.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { updatedAt: 'desc' }),
    skip,
    take: limit,
    ...(populate
      ? {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                images: true,
              },
            },
          },
        }
      : {}),
  });
  return rows.map((row) => {
    const mapped = mapVariant(row);
    if (row.product) {
      mapped.productId = mapProduct(row.product);
    }
    return mapped;
  });
}

async function count(filter = {}) {
  return prisma.productVariant.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;
  const variant = await prisma.productVariant.update({ where: { id: pk }, data });
  return mapVariant(variant);
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.productVariant.delete({ where: { id: pk } });
}

async function deleteByProduct(productId) {
  const pk = parseId(productId);
  if (!pk) return { count: 0 };
  return prisma.productVariant.deleteMany({ where: { productId: pk } });
}

async function findLowStock(threshold = 10, options = {}) {
  const { skip = 0, limit = 50, sort = { stock: 1 } } = options;
  const rows = await prisma.productVariant.findMany({
    where: { stock: { lte: threshold }, status: 'active' },
    include: {
      product: {
        select: { id: true, name: true, slug: true, status: true, images: true },
      },
    },
    orderBy: toOrderBy(sort, { stock: 'asc' }),
    skip,
    take: limit,
  });
  return rows.map((row) => {
    const mapped = mapVariant(row);
    mapped.productId = mapProduct(row.product);
    return mapped;
  });
}

async function countLowStock(threshold = 10) {
  return prisma.productVariant.count({
    where: { stock: { lte: threshold }, status: 'active' },
  });
}

async function upsertBySku(sku, data) {
  const variant = await prisma.productVariant.upsert({
    where: { sku },
    create: { ...data, sku },
    update: { ...data, sku },
  });
  return mapVariant(variant);
}

module.exports = {
  create,
  createMany,
  findById,
  findOne,
  findBySku,
  findByProduct,
  find,
  count,
  updateById,
  deleteById,
  deleteByProduct,
  findLowStock,
  countLowStock,
  upsertBySku,
};
