const collectionRepository = require('../repositories/collection.repository');
const { ApiError } = require('../utils/ApiError');
const { slugify } = require('../utils/slugify');
const { getPagination, paginatedResponse, getSort } = require('../utils/pagination');
const { parseId } = require('../utils/prismaHelpers');
const { notifyVipEarlyAccessCollection } = require('./vip.service');
const { prisma } = require('../config/prisma');

const ACCESS_LEVELS = new Set(['draft', 'vip_early_access', 'public']);

function flattenSeo(payload = {}) {
  const data = { ...payload };
  if (payload.seo && typeof payload.seo === 'object') {
    if (payload.seo.title !== undefined) data.seoTitle = payload.seo.title;
    if (payload.seo.description !== undefined) data.seoDescription = payload.seo.description;
    if (payload.seo.keywords !== undefined) data.seoKeywords = payload.seo.keywords;
    delete data.seo;
  }
  if (data.name && !data.title) data.title = data.name;
  delete data.name;
  delete data.productIds;
  delete data.id;
  delete data._id;
  if (data.accessLevel && !ACCESS_LEVELS.has(data.accessLevel)) {
    delete data.accessLevel;
  }
  if (data.publicAt === '' || data.publicAt === null) {
    data.publicAt = null;
  } else if (data.publicAt) {
    data.publicAt = new Date(data.publicAt);
  }
  return data;
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  let n = 0;
  const exclude = parseId(excludeId);
  while (true) {
    const existing = await collectionRepository.findBySlug(slug);
    if (!existing || (exclude && existing.id === exclude)) {
      return slug;
    }
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

/** Promote scheduled VIP collections to public when due */
async function promoteDueCollections() {
  const now = new Date();
  await prisma.collection.updateMany({
    where: {
      status: 'active',
      accessLevel: 'vip_early_access',
      publicAt: { lte: now },
    },
    data: { accessLevel: 'public' },
  });
}

async function list(query = {}, { publicOnly = false, isVip = false } = {}) {
  if (publicOnly) await promoteDueCollections();

  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, 'sortOrder');

  const filter = {};
  if (publicOnly) {
    filter.status = 'active';
    if (isVip) {
      filter.accessLevel = { in: ['public', 'vip_early_access'] };
    } else {
      filter.accessLevel = 'public';
    }
  } else if (query.status) {
    filter.status = query.status;
  }
  if (query.accessLevel) filter.accessLevel = query.accessLevel;
  if (query.featured === 'true' || query.featured === true) filter.featured = true;
  if (query.seasonal === 'true' || query.seasonal === true) filter.seasonal = true;
  if (query.q) {
    filter.OR = [
      { title: { contains: String(query.q) } },
      { subtitle: { contains: String(query.q) } },
    ];
  }

  const [data, total] = await Promise.all([
    collectionRepository.find(filter, { sort, skip, limit }),
    collectionRepository.count(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

async function getBySlug(slug, { isVip = false } = {}) {
  await promoteDueCollections();
  const collection = await collectionRepository.findBySlug(slug);
  if (!collection || collection.status === 'inactive') {
    throw ApiError.notFound('Collection not found');
  }
  const level = collection.accessLevel || 'public';
  if (level === 'draft') {
    throw ApiError.notFound('Collection not found');
  }
  if (level === 'vip_early_access' && !isVip) {
    throw ApiError.notFound('Collection not found');
  }
  return collection;
}

async function getById(id) {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw ApiError.notFound('Collection not found');
  return collection;
}

async function create(payload) {
  const slug = await ensureUniqueSlug(payload.slug || payload.title || payload.name);
  const created = await collectionRepository.create({
    ...flattenSeo(payload),
    slug,
    accessLevel: ACCESS_LEVELS.has(payload.accessLevel) ? payload.accessLevel : 'public',
  });
  if (created.accessLevel === 'vip_early_access' && created.status === 'active') {
    notifyVipEarlyAccessCollection(created).catch(() => {});
  }
  return created;
}

async function update(id, payload) {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw ApiError.notFound('Collection not found');

  const data = flattenSeo(payload);
  if (payload.slug || payload.title || payload.name) {
    data.slug = await ensureUniqueSlug(
      payload.slug || payload.title || payload.name || collection.title,
      id
    );
  }

  const updated = await collectionRepository.updateById(id, data);
  const becameVipDrop =
    updated.accessLevel === 'vip_early_access' &&
    updated.status === 'active' &&
    (collection.accessLevel !== 'vip_early_access' || collection.status !== 'active');
  if (becameVipDrop) {
    notifyVipEarlyAccessCollection(updated).catch(() => {});
  }
  return updated;
}

async function setFeatured(id, featured) {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw ApiError.notFound('Collection not found');
  return collectionRepository.updateById(id, { featured: Boolean(featured) });
}

async function softUpdateStatus(id, status) {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw ApiError.notFound('Collection not found');
  return collectionRepository.updateById(id, { status });
}

async function remove(id) {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw ApiError.notFound('Collection not found');
  return collectionRepository.updateById(id, { status: 'inactive' });
}

module.exports = {
  list,
  getBySlug,
  getById,
  create,
  update,
  setFeatured,
  softUpdateStatus,
  remove,
  ensureUniqueSlug,
  promoteDueCollections,
};
