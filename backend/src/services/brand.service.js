const brandRepository = require('../repositories/brand.repository');
const { ApiError } = require('../utils/ApiError');
const { slugify } = require('../utils/slugify');
const { getPagination, paginatedResponse, getSort } = require('../utils/pagination');
const { parseId } = require('../utils/prismaHelpers');

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
    const existing = await brandRepository.findBySlug(slug);
    if (!existing || (exclude && existing.id === exclude)) {
      return slug;
    }
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

async function list(query = {}, { publicOnly = false } = {}) {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, 'sortOrder');

  const filter = {};
  if (publicOnly) filter.status = 'active';
  else if (query.status) filter.status = query.status;
  if (query.q) {
    filter.OR = [
      { name: { contains: String(query.q) } },
      { description: { contains: String(query.q) } },
    ];
  }

  const [data, total] = await Promise.all([
    brandRepository.find(filter, { sort, skip, limit }),
    brandRepository.count(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

async function getBySlug(slug) {
  const brand = await brandRepository.findBySlug(slug);
  if (!brand || brand.status === 'inactive') {
    throw ApiError.notFound('Brand not found');
  }
  return brand;
}

async function getById(id) {
  const brand = await brandRepository.findById(id);
  if (!brand) throw ApiError.notFound('Brand not found');
  return brand;
}

async function create(payload) {
  const slug = await ensureUniqueSlug(payload.slug || payload.name);
  return brandRepository.create({ ...flattenSeo(payload), slug });
}

async function update(id, payload) {
  const brand = await brandRepository.findById(id);
  if (!brand) throw ApiError.notFound('Brand not found');

  const data = flattenSeo(payload);
  if (payload.slug || payload.name) {
    data.slug = await ensureUniqueSlug(payload.slug || payload.name || brand.name, id);
  }

  return brandRepository.updateById(id, data);
}

async function softUpdateStatus(id, status) {
  const brand = await brandRepository.findById(id);
  if (!brand) throw ApiError.notFound('Brand not found');
  return brandRepository.updateById(id, { status });
}

async function remove(id) {
  const brand = await brandRepository.findById(id);
  if (!brand) throw ApiError.notFound('Brand not found');
  return brandRepository.updateById(id, { status: 'inactive' });
}

module.exports = {
  list,
  getBySlug,
  getById,
  create,
  update,
  softUpdateStatus,
  remove,
  ensureUniqueSlug,
};
