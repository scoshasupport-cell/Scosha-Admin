const { prisma } = require('../config/prisma');
const { parseId, toOrderBy, mapProduct } = require('../utils/prismaHelpers');

const PRODUCT_SUMMARY_SELECT = {
  id: true,
  name: true,
  slug: true,
  images: true,
  basePrice: true,
  status: true,
  badge: true,
  ratingAvg: true,
};

function mapCollection(collection) {
  if (!collection) return collection;
  const mapped = { ...collection };
  if (Array.isArray(collection.products)) {
    mapped.productIds = collection.products
      .map((pc) => (pc.product ? mapProduct(pc.product) : pc.productId))
      .filter(Boolean);
  }
  return mapped;
}

async function create(data) {
  return prisma.collection.create({ data });
}

async function findById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  const collection = await prisma.collection.findUnique({
    where: { id: pk },
    include: {
      products: {
        include: { product: { select: PRODUCT_SUMMARY_SELECT } },
      },
    },
  });
  return mapCollection(collection);
}

async function findBySlug(slug) {
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        include: { product: { select: PRODUCT_SUMMARY_SELECT } },
      },
    },
  });
  return mapCollection(collection);
}

async function findOne(filter = {}) {
  return prisma.collection.findFirst({ where: filter });
}

async function find(filter = {}, options = {}) {
  const { sort = { sortOrder: 1, title: 1 }, skip = 0, limit = 12 } = options;
  const rows = await prisma.collection.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { sortOrder: 'asc' }),
    skip,
    take: limit,
  });
  return rows.map(mapCollection);
}

async function count(filter = {}) {
  return prisma.collection.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.collection.update({ where: { id: pk }, data });
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.collection.delete({ where: { id: pk } });
}

async function upsertBySlug(slug, data) {
  return prisma.collection.upsert({
    where: { slug },
    create: { ...data, slug },
    update: { ...data, slug },
  });
}

async function addProduct(collectionId, productId) {
  const cId = parseId(collectionId);
  const pId = parseId(productId);
  if (!cId || !pId) return null;
  await prisma.productCollection.upsert({
    where: {
      productId_collectionId: { productId: pId, collectionId: cId },
    },
    create: { productId: pId, collectionId: cId },
    update: {},
  });
  return findById(cId);
}

async function setProducts(collectionId, productIds = []) {
  const cId = parseId(collectionId);
  if (!cId) return null;
  const ids = [...new Set(productIds.map(parseId).filter(Boolean))];

  await prisma.$transaction([
    prisma.productCollection.deleteMany({ where: { collectionId: cId } }),
    ...(ids.length
      ? [
          prisma.productCollection.createMany({
            data: ids.map((productId) => ({ productId, collectionId: cId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  return findById(cId);
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
  addProduct,
  setProducts,
};
