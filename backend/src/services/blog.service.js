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

function mapAuthor(author) {
  if (!author) return author;
  return {
    _id: author.id,
    id: author.id,
    name: author.name,
    email: author.email,
    avatar: author.avatar,
  };
}

function mapBlog(blog) {
  if (!blog) return blog;
  const { author, ...rest } = blog;
  return {
    ...rest,
    authorId: author ? mapAuthor(author) : rest.authorId,
    seo: {
      title: rest.seoTitle,
      description: rest.seoDescription,
      keywords: rest.seoKeywords,
    },
  };
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const existing = await prisma.blog.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === Number(excludeId))) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

function tagFilter(tag) {
  if (!tag) return {};
  return { tags: { array_contains: tag } };
}

async function listPublic(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-publishedAt'));
  const where = { status: 'published', ...tagFilter(query.tag) };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { excerpt: { contains: query.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      include: { author: { select: { id: true, name: true, avatar: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.blog.count({ where }),
  ]);

  const data = rows.map((b) => {
    const { content, ...rest } = b;
    return mapBlog(rest);
  });
  return paginatedResponse(data, total, page, limit);
}

async function getBySlug(slug) {
  const blog = await prisma.blog.findFirst({
    where: { slug, status: 'published' },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });
  if (!blog) throw ApiError.notFound('Blog post not found');
  return mapBlog(blog);
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-updatedAt'));
  const where = { ...tagFilter(query.tag) };
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { slug: { contains: query.q } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.blog.count({ where }),
  ]);
  return paginatedResponse(data.map(mapBlog), total, page, limit);
}

async function getById(id) {
  const blog = await prisma.blog.findUnique({
    where: { id: Number(id) },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  if (!blog) throw ApiError.notFound('Blog post not found');
  return mapBlog(blog);
}

async function create(payload, adminId, req) {
  const data = flattenSeo(payload);
  data.slug = await ensureUniqueSlug(data.slug || data.title);
  data.authorId = Number(adminId);
  if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();

  const blog = await prisma.blog.create({
    data,
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  const mapped = mapBlog(blog);
  await logAdminAction(adminId, 'create', 'Blog', blog.id, null, mapped, req);
  return mapped;
}

async function update(id, payload, adminId, req) {
  const blog = await prisma.blog.findUnique({ where: { id: Number(id) } });
  if (!blog) throw ApiError.notFound('Blog post not found');
  const before = mapBlog(blog);
  const data = flattenSeo(payload);
  if (payload.slug || payload.title) {
    data.slug = await ensureUniqueSlug(payload.slug || payload.title || blog.title, id);
  }
  if (data.status === 'published' && !blog.publishedAt && !data.publishedAt) {
    data.publishedAt = new Date();
  }
  const updated = await prisma.blog.update({
    where: { id: blog.id },
    data,
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  const after = mapBlog(updated);
  await logAdminAction(adminId, 'update', 'Blog', blog.id, before, after, req);
  return after;
}

async function remove(id, adminId, req) {
  const blog = await prisma.blog.findUnique({ where: { id: Number(id) } });
  if (!blog) throw ApiError.notFound('Blog post not found');
  const before = mapBlog(blog);
  await prisma.blog.delete({ where: { id: blog.id } });
  await logAdminAction(adminId, 'delete', 'Blog', id, before, null, req);
  return { deleted: true, id: blog.id };
}

module.exports = { listPublic, getBySlug, listAdmin, getById, create, update, remove };
