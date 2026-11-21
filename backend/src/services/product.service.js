const { prisma } = require('../config/prisma');
const productRepository = require('../repositories/product.repository');
const variantRepository = require('../repositories/variant.repository');
const brandRepository = require('../repositories/brand.repository');
const categoryRepository = require('../repositories/category.repository');
const collectionRepository = require('../repositories/collection.repository');
const { ApiError } = require('../utils/ApiError');
const { slugify } = require('../utils/slugify');
const { getPagination, paginatedResponse, getSort } = require('../utils/pagination');
const { parseId, toNumber } = require('../utils/prismaHelpers');
const { notifyVipEarlyAccessProduct } = require('./vip.service');

function flattenSeo(payload = {}) {
  const data = { ...payload };
  if (payload.seo && typeof payload.seo === 'object') {
    if (payload.seo.title !== undefined) data.seoTitle = payload.seo.title;
    if (payload.seo.description !== undefined) data.seoDescription = payload.seo.description;
    if (payload.seo.keywords !== undefined) data.seoKeywords = payload.seo.keywords;
    delete data.seo;
  }
  delete data.id;
  delete data._id;
  return data;
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  let n = 0;
  const exclude = parseId(excludeId);
  while (true) {
    const existing = await productRepository.findBySlug(slug, { populate: false });
    if (!existing || (exclude && existing.id === exclude)) {
      return slug;
    }
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

async function resolveRef(value, finderBySlug, label) {
  if (!value) return null;
  const asId = parseId(value);
  if (asId) return asId;
  const doc = await finderBySlug(value);
  if (!doc) throw ApiError.badRequest(`Invalid ${label}: ${value}`);
  return doc.id;
}

async function buildProductFilter(query = {}, { publicOnly = false, isVip = false } = {}) {
  const filter = {};

  if (publicOnly) {
    filter.status = 'active';
    // VIP early-access drops stay hidden from guests and non-VIP shoppers
    if (!isVip) {
      filter.vipEarlyAccess = false;
    }
  } else if (query.status) {
    filter.status = query.status;
  }

  if (query.brand) {
    filter.brandId = await resolveRef(query.brand, brandRepository.findBySlug, 'brand');
  }
  if (query.category) {
    filter.categoryId = await resolveRef(query.category, categoryRepository.findBySlug, 'category');
  }
  if (query.subcategory || query.subCategory) {
    const raw = String(query.subcategory || query.subCategory);
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 1) {
      filter.subCategoryId = await resolveRef(parts[0], categoryRepository.findBySlug, 'subcategory');
    } else if (parts.length > 1) {
      const ids = [];
      for (const part of parts) {
        const asId = parseId(part);
        if (asId) {
          ids.push(asId);
          continue;
        }
        const doc = await categoryRepository.findBySlug(part);
        if (doc) ids.push(doc.id);
      }
      if (!ids.length) {
        throw ApiError.badRequest(`Invalid subcategory: ${raw}`);
      }
      filter.subCategoryId = { in: ids };
    }
  }
  if (query.collection) {
    const collectionId = await resolveRef(
      query.collection,
      async (slug) => collectionRepository.findOne({ slug }),
      'collection'
    );
    filter.collections = { some: { collectionId } };
  }

  if (query.featured === 'true' || query.featured === true) filter.featured = true;
  if (query.trending === 'true' || query.trending === true) filter.trending = true;
  if (query.newArrival === 'true' || query.newArrival === true) filter.newArrival = true;
  if (query.bestSeller === 'true' || query.bestSeller === true) filter.bestSeller = true;

  if (query.minPrice || query.maxPrice) {
    filter.basePrice = {};
    if (query.minPrice) filter.basePrice.gte = Number(query.minPrice);
    if (query.maxPrice) filter.basePrice.lte = Number(query.maxPrice);
  }

  if (query.minRating || query.rating) {
    filter.ratingAvg = { gte: Number(query.minRating || query.rating) };
  }

  if (query.q || query.search) {
    const q = String(query.q || query.search).trim();
    filter.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  return filter;
}

function mapSort(query) {
  const sortKey = query.sort || '-createdAt';
  const presets = {
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    rating: { ratingAvg: -1 },
    popular: { reviewCount: -1 },
    name: { name: 1 },
  };
  if (presets[sortKey]) return presets[sortKey];
  return getSort(query, '-createdAt');
}

function matchesTags(productTags, required) {
  if (!required?.length) return true;
  const tags = Array.isArray(productTags) ? productTags.map(String) : [];
  return required.every((t) => tags.includes(String(t)));
}

function buildVariantRelationFilter(query) {
  const variantWhere = { status: 'active' };
  let needsVariantFilter = false;

  if (query.color) {
    needsVariantFilter = true;
    variantWhere.colorName = { equals: String(query.color) };
  }
  if (query.size) {
    needsVariantFilter = true;
    variantWhere.size = { equals: String(query.size) };
  }
  if (query.availability === 'in_stock' || query.inStock === 'true') {
    needsVariantFilter = true;
    variantWhere.stock = { gt: 0 };
  } else if (query.availability === 'out_of_stock' || query.inStock === 'false') {
    needsVariantFilter = true;
    variantWhere.stock = { lte: 0 };
  }

  return needsVariantFilter ? variantWhere : null;
}

async function list(query = {}, { publicOnly = false, isVip = false } = {}) {
  const { page, limit, skip } = getPagination(query);
  const sort = mapSort(query);
  const filter = await buildProductFilter(query, { publicOnly, isVip });

  const tagList = [];
  if (query.tag) tagList.push(String(query.tag));
  if (query.tags) {
    String(query.tags)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => tagList.push(t));
  }

  const variantWhere = buildVariantRelationFilter(query);
  if (variantWhere) {
    filter.variants = { some: variantWhere };
  }

  // JSON tags cannot be indexed efficiently in MySQL — scan a capped set only when needed
  if (tagList.length) {
    const { CATALOG } = require('../constants/commerce');
    const candidates = await prisma.product.findMany({
      where: filter,
      select: { id: true, tags: true },
      take: CATALOG.MAX_TAG_SCAN,
    });
    const ids = candidates.filter((p) => matchesTags(p.tags, tagList)).map((p) => p.id);
    filter.id = { in: ids.length ? ids : [-1] };
  }

  const [data, total] = await Promise.all([
    productRepository.find(filter, { sort, skip, limit }),
    productRepository.count(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

/** Normalize any legacy ama/pup catalog code in a URL to sco (Scosha-only DB). */
function toScoSlugCandidate(slug) {
  let s = String(slug || '').trim();
  if (!s) return '';
  s = s.replace(/-(ama|pup)-/gi, '-sco-');
  s = s.replace(/-(?:sco)-([a-z]+)-(\d+)\s*$/i, (_, kind, num) => {
    return `-sco-${kind.toLowerCase()}-${String(num).padStart(4, '0')}`;
  });
  return s;
}

function unpadCatalogTail(slug) {
  return String(slug || '').replace(
    /-(sco|pup|ama)-([a-z]+)-0*(\d+)\s*$/i,
    (_, prefix, kind, num) => `-${prefix.toLowerCase()}-${kind.toLowerCase()}-${num}`
  );
}

function catalogCodeCandidates(slug) {
  const raw = String(slug || '').trim();
  if (!raw) return [];
  const sco = toScoSlugCandidate(raw);
  const scoUnpadded = unpadCatalogTail(sco);
  // List responses rewrite pup/ama → sco without always matching DB yet; try all variants.
  const prefixes = [raw, sco, scoUnpadded];
  for (const base of [raw, sco, scoUnpadded]) {
    prefixes.push(base.replace(/-sco-/gi, '-pup-'));
    prefixes.push(base.replace(/-sco-/gi, '-ama-'));
    prefixes.push(base.replace(/-pup-/gi, '-sco-'));
    prefixes.push(base.replace(/-ama-/gi, '-sco-'));
  }
  return [...new Set(prefixes.filter(Boolean))];
}

async function getBySlug(slug, { isVip = false } = {}) {
  let product = null;
  for (const candidate of catalogCodeCandidates(slug)) {
    product = await productRepository.findBySlug(candidate);
    if (product) break;
  }
  // Fallback: match by trailing catalog code (…-sco-clo-0053 / …-pup-clo-109)
  if (!product) {
    const m = String(slug || '')
      .trim()
      .match(/-(?:sco|pup|ama)-([a-z]+)-0*(\d+)\s*$/i);
    if (m) {
      const kind = m[1].toLowerCase();
      const num = String(parseInt(m[2], 10));
      const padded = num.padStart(4, '0');
      for (const prefix of ['sco', 'pup', 'ama']) {
        for (const n of [padded, num]) {
          const tail = `-${prefix}-${kind}-${n}`;
          product = await productRepository.findOne(
            { slug: { endsWith: tail }, status: 'active' },
            { populate: true }
          );
          if (product) break;
        }
        if (product) break;
      }
    }
  }
  if (!product || product.status !== 'active') {
    throw ApiError.notFound('Product not found');
  }
  if (product.vipEarlyAccess && !isVip) {
    throw ApiError.notFound('Product not found');
  }
  const variants = await variantRepository.findByProduct(product.id, { status: 'active' });
  // Always expose Scosha codes in API responses
  const scoSlug = toScoSlugCandidate(product.slug);
  return { ...product, slug: scoSlug, variants };
}

async function getById(id, { includeInactive = false } = {}) {
  const product = await productRepository.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  if (!includeInactive && product.status === 'archived') {
    throw ApiError.notFound('Product not found');
  }
  const variants = await variantRepository.findByProduct(product.id);
  return { ...product, variants };
}

async function getRelated(id, limit = 8, { isVip = false } = {}) {
  const product = await productRepository.findById(id, { populate: false });
  if (!product) throw ApiError.notFound('Product not found');
  return productRepository.findRelated(product, Number(limit) || 8, { isVip });
}

async function create(payload) {
  const brandId = parseId(payload.brandId);
  const categoryId = parseId(payload.categoryId);
  const brand = await brandRepository.findById(brandId);
  if (!brand) throw ApiError.badRequest('Brand not found');
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw ApiError.badRequest('Category not found');

  let subCategoryId = null;
  if (payload.subCategoryId) {
    subCategoryId = parseId(payload.subCategoryId);
    const sub = await categoryRepository.findById(subCategoryId);
    if (!sub) throw ApiError.badRequest('Subcategory not found');
  }

  const slug = await ensureUniqueSlug(payload.slug || payload.name);
  const data = flattenSeo(payload);
  const product = await productRepository.create({
    ...data,
    brandId,
    categoryId,
    subCategoryId,
    slug,
    basePrice: toNumber(payload.basePrice),
    comparePrice: payload.comparePrice != null ? toNumber(payload.comparePrice) : null,
    weight: payload.weight != null ? toNumber(payload.weight) : 0,
  });
  const full = await getById(product.id, { includeInactive: true });
  if (full.vipEarlyAccess && full.status === 'active') {
    setImmediate(() => notifyVipEarlyAccessProduct(full));
  }
  return full;
}

async function update(id, payload) {
  const existing = await productRepository.findById(id, { populate: false });
  if (!existing) throw ApiError.notFound('Product not found');

  const data = flattenSeo(payload);
  if (payload.slug || payload.name) {
    data.slug = await ensureUniqueSlug(payload.slug || payload.name || existing.name, id);
  }

  if (payload.brandId) {
    data.brandId = parseId(payload.brandId);
    const brand = await brandRepository.findById(data.brandId);
    if (!brand) throw ApiError.badRequest('Brand not found');
  }
  if (payload.categoryId) {
    data.categoryId = parseId(payload.categoryId);
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) throw ApiError.badRequest('Category not found');
  }
  if (payload.subCategoryId !== undefined) {
    data.subCategoryId = payload.subCategoryId ? parseId(payload.subCategoryId) : null;
  }
  if (payload.basePrice !== undefined) data.basePrice = toNumber(payload.basePrice);
  if (payload.comparePrice !== undefined) {
    data.comparePrice = payload.comparePrice == null ? null : toNumber(payload.comparePrice);
  }
  if (payload.weight !== undefined) data.weight = toNumber(payload.weight);
  if (payload.relatedProductIds) {
    data.relatedProductIds = payload.relatedProductIds.map(parseId).filter(Boolean);
  }

  await productRepository.updateById(id, data);
  const full = await getById(id, { includeInactive: true });
  const becameVipDrop =
    full.vipEarlyAccess &&
    full.status === 'active' &&
    (!existing.vipEarlyAccess || existing.status !== 'active');
  if (becameVipDrop) {
    setImmediate(() => notifyVipEarlyAccessProduct(full));
  }
  return full;
}

async function updateFlags(id, flags = {}) {
  const allowed = ['featured', 'trending', 'newArrival', 'bestSeller', 'vipEarlyAccess', 'status'];
  const data = {};
  for (const key of allowed) {
    if (flags[key] !== undefined) data[key] = flags[key];
  }
  if (!Object.keys(data).length) {
    throw ApiError.badRequest('No flags provided');
  }
  const product = await productRepository.findById(id, { populate: false });
  if (!product) throw ApiError.notFound('Product not found');
  const updated = await productRepository.updateById(id, data);
  const becameVipDrop =
    (updated.vipEarlyAccess ?? product.vipEarlyAccess) &&
    (updated.status ?? product.status) === 'active' &&
    (!product.vipEarlyAccess || product.status !== 'active' || data.vipEarlyAccess === true);
  if (becameVipDrop && (updated.vipEarlyAccess || data.vipEarlyAccess)) {
    setImmediate(() => notifyVipEarlyAccessProduct({ ...product, ...updated }));
  }
  return updated;
}

async function setRelated(id, relatedProductIds = []) {
  const product = await productRepository.findById(id, { populate: false });
  if (!product) throw ApiError.notFound('Product not found');
  return productRepository.updateById(id, {
    relatedProductIds: (relatedProductIds || []).map(parseId).filter(Boolean),
  });
}

async function updateSeo(id, seo) {
  const product = await productRepository.findById(id, { populate: false });
  if (!product) throw ApiError.notFound('Product not found');
  const data = {};
  if (seo?.title !== undefined) data.seoTitle = seo.title;
  if (seo?.description !== undefined) data.seoDescription = seo.description;
  if (seo?.keywords !== undefined) data.seoKeywords = seo.keywords;
  return productRepository.updateById(id, data);
}

async function remove(id) {
  const product = await productRepository.findById(id, { populate: false });
  if (!product) throw ApiError.notFound('Product not found');
  return productRepository.updateById(id, { status: 'archived' });
}

module.exports = {
  list,
  getBySlug,
  getById,
  getRelated,
  create,
  update,
  updateFlags,
  setRelated,
  updateSeo,
  remove,
  ensureUniqueSlug,
  buildProductFilter,
};
