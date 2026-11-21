const { prisma } = require('../config/prisma');
const { parseId, toOrderBy, mapProduct } = require('../utils/prismaHelpers');

const DEFAULT_INCLUDE = {
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
  subCategory: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { status: 'active' },
    select: {
      id: true,
      colorName: true,
      colorHex: true,
      size: true,
      sku: true,
      price: true,
      comparePrice: true,
      stock: true,
      images: true,
      status: true,
    },
  },
  collections: {
    include: {
      collection: { select: { id: true, title: true, slug: true } },
    },
  },
};

function shapeProduct(product) {
  if (!product) return product;
  const mapped = mapProduct(product);
  // Preserve prior API shape: brandId/categoryId as nested objects when included
  if (product.brand) mapped.brandId = product.brand;
  if (product.category) mapped.categoryId = product.category;
  if (product.subCategory) mapped.subCategoryId = product.subCategory;
  if (Array.isArray(product.collections)) {
    mapped.collectionIds = product.collections
      .map((pc) => pc.collection)
      .filter(Boolean);
  }
  return mapped;
}

async function create(data) {
  const { collectionIds, ...rest } = data;
  const product = await prisma.product.create({
    data: {
      ...rest,
      ...(Array.isArray(collectionIds) && collectionIds.length
        ? {
            collections: {
              create: collectionIds
                .map(parseId)
                .filter(Boolean)
                .map((collectionId) => ({ collectionId })),
            },
          }
        : {}),
    },
    include: DEFAULT_INCLUDE,
  });
  return shapeProduct(product);
}

async function findById(id, options = {}) {
  const pk = parseId(id);
  if (!pk) return null;
  const product = await prisma.product.findUnique({
    where: { id: pk },
    ...(options.populate === false ? {} : { include: options.include || DEFAULT_INCLUDE }),
  });
  return options.populate === false ? product : shapeProduct(product);
}

async function findBySlug(slug, options = {}) {
  const product = await prisma.product.findUnique({
    where: { slug },
    ...(options.populate === false ? {} : { include: options.include || DEFAULT_INCLUDE }),
  });
  return options.populate === false ? product : shapeProduct(product);
}

async function findOne(filter = {}, options = {}) {
  const product = await prisma.product.findFirst({
    where: filter,
    ...(options.populate ? { include: options.include || DEFAULT_INCLUDE } : {}),
  });
  return options.populate ? shapeProduct(product) : product;
}

async function find(filter = {}, options = {}) {
  const {
    sort = { createdAt: -1 },
    skip = 0,
    limit = 12,
    populate = true,
    select,
  } = options;

  const rows = await prisma.product.findMany({
    where: filter,
    orderBy: toOrderBy(sort, { createdAt: 'desc' }),
    skip,
    take: limit,
    ...(select
      ? { select }
      : populate
        ? { include: DEFAULT_INCLUDE }
        : {}),
  });

  if (select || populate === false) return rows;
  return rows.map(shapeProduct);
}

async function count(filter = {}) {
  return prisma.product.count({ where: filter });
}

async function updateById(id, data) {
  const pk = parseId(id);
  if (!pk) return null;

  const { collectionIds, ...rest } = data;
  const product = await prisma.$transaction(async (tx) => {
    if (Array.isArray(collectionIds)) {
      await tx.productCollection.deleteMany({ where: { productId: pk } });
      const ids = collectionIds.map(parseId).filter(Boolean);
      if (ids.length) {
        await tx.productCollection.createMany({
          data: ids.map((collectionId) => ({ productId: pk, collectionId })),
          skipDuplicates: true,
        });
      }
    }
    return tx.product.update({
      where: { id: pk },
      data: rest,
      include: DEFAULT_INCLUDE,
    });
  });

  return shapeProduct(product);
}

async function deleteById(id) {
  const pk = parseId(id);
  if (!pk) return null;
  return prisma.product.delete({ where: { id: pk } });
}

async function upsertBySlug(slug, data) {
  const { collectionIds, ...rest } = data;
  const product = await prisma.product.upsert({
    where: { slug },
    create: { ...rest, slug },
    update: { ...rest, slug },
  });

  if (Array.isArray(collectionIds)) {
    await prisma.productCollection.deleteMany({ where: { productId: product.id } });
    const ids = [...new Set(collectionIds.map(parseId).filter(Boolean))];
    if (ids.length) {
      await prisma.productCollection.createMany({
        data: ids.map((collectionId) => ({ productId: product.id, collectionId })),
        skipDuplicates: true,
      });
    }
  }

  return product;
}

async function findRelated(product, limit = 8, { isVip = false } = {}) {
  const relatedIds = Array.isArray(product.relatedProductIds)
    ? product.relatedProductIds.map(parseId).filter(Boolean)
    : [];

  const vipFilter = isVip ? {} : { vipEarlyAccess: false };

  if (relatedIds.length) {
    const rows = await prisma.product.findMany({
      where: { id: { in: relatedIds }, status: 'active', ...vipFilter },
      include: DEFAULT_INCLUDE,
      take: limit,
    });
    return rows.map(shapeProduct);
  }

  const or = [];
  if (product.categoryId) or.push({ categoryId: product.categoryId });
  if (product.brandId) or.push({ brandId: product.brandId });

  const rows = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      status: 'active',
      ...vipFilter,
      ...(or.length ? { OR: or } : {}),
    },
    include: DEFAULT_INCLUDE,
    orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return rows.map(shapeProduct);
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
  findRelated,
  DEFAULT_INCLUDE,
  shapeProduct,
};
