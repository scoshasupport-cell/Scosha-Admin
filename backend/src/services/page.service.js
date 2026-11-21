const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { slugify } = require('../utils/slugify');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

function flattenSeo(payload = {}) {
  const data = { ...payload };
  if (payload.seo) {
    if (payload.seo.title !== undefined) data.seoTitle = payload.seo.title;
    if (payload.seo.description !== undefined) data.seoDescription = payload.seo.description;
    if (payload.seo.keywords !== undefined) data.seoKeywords = payload.seo.keywords;
    delete data.seo;
  }
  return data;
}

function mapPage(page) {
  if (!page) return page;
  return {
    ...page,
    seo: {
      title: page.seoTitle,
      description: page.seoDescription,
      keywords: page.seoKeywords,
    },
  };
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === Number(excludeId))) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

async function getBySlug(slug) {
  const page = await prisma.page.findFirst({
    where: { slug, status: 'published' },
  });
  if (!page) throw ApiError.notFound('Page not found');
  return mapPage(page);
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-updatedAt'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { slug: { contains: query.q } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.page.findMany({ where, orderBy, skip, take: limit }),
    prisma.page.count({ where }),
  ]);
  return paginatedResponse(data.map(mapPage), total, page, limit);
}

async function getById(id) {
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) throw ApiError.notFound('Page not found');
  return mapPage(page);
}

async function create(payload, adminId, req) {
  const data = flattenSeo(payload);
  data.slug = await ensureUniqueSlug(data.slug || data.title);
  const page = await prisma.page.create({ data });
  const mapped = mapPage(page);
  await logAdminAction(adminId, 'create', 'Page', page.id, null, mapped, req);
  return mapped;
}

async function update(id, payload, adminId, req) {
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) throw ApiError.notFound('Page not found');
  const before = mapPage(page);
  const data = flattenSeo(payload);
  if (payload.slug || payload.title) {
    data.slug = await ensureUniqueSlug(payload.slug || payload.title || page.title, id);
  }
  const updated = await prisma.page.update({
    where: { id: page.id },
    data,
  });
  const after = mapPage(updated);
  await logAdminAction(adminId, 'update', 'Page', page.id, before, after, req);
  return after;
}

async function remove(id, adminId, req) {
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) throw ApiError.notFound('Page not found');
  const before = mapPage(page);
  await prisma.page.delete({ where: { id: page.id } });
  await logAdminAction(adminId, 'delete', 'Page', id, before, null, req);
  return { deleted: true, id: page.id };
}

module.exports = { getBySlug, listAdmin, getById, create, update, remove };
