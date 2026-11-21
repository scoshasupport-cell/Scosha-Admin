const { prisma } = require('../config/prisma');
const brandRepository = require('../repositories/brand.repository');
const categoryRepository = require('../repositories/category.repository');
const collectionRepository = require('../repositories/collection.repository');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { parseId, mapProduct, toNumber } = require('../utils/prismaHelpers');

async function resolveId(value, finder) {
  if (!value) return null;
  const asId = parseId(value);
  if (asId) return asId;
  const doc = await finder(value);
  return doc ? doc.id : null;
}

function sortOrderBy(sortKey = 'newest') {
  const map = {
    relevance: [{ createdAt: 'desc' }],
    price_asc: [{ basePrice: 'asc' }],
    price_desc: [{ basePrice: 'desc' }],
    newest: [{ createdAt: 'desc' }],
    rating: [{ ratingAvg: 'desc' }],
    popular: [{ reviewCount: 'desc' }],
    name: [{ name: 'asc' }],
  };
  return map[sortKey] || map.newest;
}

async function buildWhere(query = {}) {
  const where = { status: 'active' };

  if (query.q) {
    const q = String(query.q).trim();
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  if (query.brand) {
    const id = await resolveId(query.brand, brandRepository.findBySlug);
    if (id) where.brandId = id;
  }
  if (query.category) {
    const id = await resolveId(query.category, categoryRepository.findBySlug);
    if (id) where.categoryId = id;
  }
  if (query.subcategory || query.subCategory) {
    const raw = String(query.subcategory || query.subCategory);
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 1) {
      const id = await resolveId(parts[0], categoryRepository.findBySlug);
      if (id) where.subCategoryId = id;
    } else if (parts.length > 1) {
      const ids = [];
      for (const part of parts) {
        const id = await resolveId(part, categoryRepository.findBySlug);
        if (id) ids.push(id);
      }
      if (ids.length) where.subCategoryId = { in: ids };
    }
  }
  if (query.collection) {
    const id = await resolveId(query.collection, (slug) =>
      collectionRepository.findOne({ slug })
    );
    if (id) where.collections = { some: { collectionId: id } };
  }

  if (query.minPrice || query.maxPrice) {
    where.basePrice = {};
    if (query.minPrice) where.basePrice.gte = Number(query.minPrice);
    if (query.maxPrice) where.basePrice.lte = Number(query.maxPrice);
  }
  if (query.minRating || query.rating) {
    where.ratingAvg = { gte: Number(query.minRating || query.rating) };
  }
  if (query.featured === 'true') where.featured = true;
  if (query.trending === 'true') where.trending = true;
  if (query.newArrival === 'true') where.newArrival = true;
  if (query.bestSeller === 'true') where.bestSeller = true;

  const needsVariant = Boolean(
    query.color || query.size || query.availability || query.inStock !== undefined
  );

  if (needsVariant) {
    const variantWhere = { status: 'active' };
    if (query.color) variantWhere.colorName = { equals: String(query.color) };
    if (query.size) variantWhere.size = { equals: String(query.size) };
    if (query.availability === 'in_stock' || query.inStock === 'true') {
      variantWhere.stock = { gt: 0 };
    } else if (query.availability === 'out_of_stock' || query.inStock === 'false') {
      variantWhere.stock = { lte: 0 };
    }
    where.variants = { some: variantWhere };
  }

  return where;
}

async function buildFacets(where) {
  const { CATALOG } = require('../constants/commerce');
  // Cap facet sample size so search stays usable at 10k+ SKUs
  const matched = await prisma.product.findMany({
    where,
    select: {
      id: true,
      brandId: true,
      categoryId: true,
      basePrice: true,
    },
    take: CATALOG.MAX_FACET_SAMPLE,
    orderBy: { createdAt: 'desc' },
  });

  const productIds = matched.map((p) => p.id);
  const brandCounts = new Map();
  const categoryCounts = new Map();
  let minPrice = null;
  let maxPrice = null;

  for (const p of matched) {
    brandCounts.set(p.brandId, (brandCounts.get(p.brandId) || 0) + 1);
    categoryCounts.set(p.categoryId, (categoryCounts.get(p.categoryId) || 0) + 1);
    const price = toNumber(p.basePrice);
    if (minPrice == null || price < minPrice) minPrice = price;
    if (maxPrice == null || price > maxPrice) maxPrice = price;
  }

  const brandIds = [...brandCounts.keys()];
  const categoryIds = [...categoryCounts.keys()];

  const [brands, categories, colorGroups, sizeGroups, stockGroups] = await Promise.all([
    brandIds.length
      ? prisma.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true, slug: true },
        })
      : [],
    categoryIds.length
      ? prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, slug: true },
        })
      : [],
    productIds.length
      ? prisma.productVariant.groupBy({
          by: ['colorName', 'colorHex'],
          where: { productId: { in: productIds }, status: 'active' },
          _count: { _all: true },
          orderBy: { colorName: 'asc' },
          take: 40,
        })
      : [],
    productIds.length
      ? prisma.productVariant.groupBy({
          by: ['size'],
          where: { productId: { in: productIds }, status: 'active' },
          _count: { _all: true },
          orderBy: { size: 'asc' },
        })
      : [],
    productIds.length
      ? prisma.productVariant.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds }, status: 'active' },
          _sum: { stock: true },
        })
      : [],
  ]);

  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let inStock = 0;
  let outOfStock = 0;
  const stockByProduct = new Map(stockGroups.map((g) => [g.productId, g._sum.stock || 0]));
  for (const id of productIds) {
    if ((stockByProduct.get(id) || 0) > 0) inStock += 1;
    else outOfStock += 1;
  }

  return {
    brands: [...brandCounts.entries()]
      .map(([id, count]) => ({
        id,
        count,
        name: brandMap.get(id)?.name || null,
        slug: brandMap.get(id)?.slug || null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    categories: [...categoryCounts.entries()]
      .map(([id, count]) => ({
        id,
        count,
        name: categoryMap.get(id)?.name || null,
        slug: categoryMap.get(id)?.slug || null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    colors: colorGroups.map((g) => ({
      name: g.colorName,
      hex: g.colorHex,
      count: g._count._all,
    })),
    sizes: sizeGroups.map((g) => ({
      size: g.size,
      count: g._count._all,
    })),
    priceRange: { min: minPrice || 0, max: maxPrice || 0 },
    availability: { inStock, outOfStock },
  };
}

/**
 * Keyword search with filters, facets (via groupBy / multiple queries), sort, pagination.
 */
async function search(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const where = await buildWhere(query);
  const orderBy = sortOrderBy(query.sort || (query.q ? 'relevance' : 'newest'));

  const [total, rows, facets] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        brand: { select: { id: true, name: true, slug: true, logo: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    buildFacets(where),
  ]);

  const data = rows.map((p) => {
    const mapped = mapProduct(p);
    mapped.brandId = p.brand;
    mapped.categoryId = p.category;
    return mapped;
  });

  const result = paginatedResponse(data, total, page, limit);
  result.facets = facets;
  return result;
}

async function suggestions(q = '', limit = 8) {
  const term = String(q || '').trim();
  if (!term || term.length < 2) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      status: 'active',
      OR: [
        { name: { contains: term } },
        { slug: { contains: term } },
      ],
    },
    take: Number(limit) || 8,
    orderBy: [{ ratingAvg: 'desc' }, { reviewCount: 'desc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      basePrice: true,
      brand: { select: { name: true, slug: true } },
    },
  });

  return products.map((p) => ({
    type: 'product',
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: Array.isArray(p.images) ? p.images[0] : null,
    price: Number(p.basePrice),
    brand: p.brand ? { name: p.brand.name, slug: p.brand.slug } : null,
  }));
}

module.exports = {
  search,
  suggestions,
};
