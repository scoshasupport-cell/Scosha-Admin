const categoryRepository = require('../repositories/category.repository');
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
  if (data.parentId !== undefined && data.parentId !== null) {
    data.parentId = parseId(data.parentId);
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
    const existing = await categoryRepository.findBySlug(slug);
    if (!existing || (exclude && existing.id === exclude)) {
      return slug;
    }
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

function buildTree(categories) {
  const map = new Map();
  const roots = [];

  categories.forEach((cat) => {
    map.set(String(cat.id), { ...cat, children: [] });
  });

  map.forEach((node) => {
    const parentKey = node.parentId ? String(node.parentId) : null;
    if (parentKey && map.has(parentKey)) {
      map.get(parentKey).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

async function list(query = {}, { publicOnly = false } = {}) {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, 'sortOrder');

  const filter = {};
  if (publicOnly) filter.status = 'active';
  else if (query.status) filter.status = query.status;

  if (query.parentId === 'null' || query.root === 'true') {
    filter.parentId = null;
  } else if (query.parentId) {
    filter.parentId = parseId(query.parentId);
  }

  if (query.q) {
    filter.OR = [
      { name: { contains: String(query.q) } },
      { description: { contains: String(query.q) } },
    ];
  }

  const [data, total] = await Promise.all([
    categoryRepository.find(filter, { sort, skip, limit }),
    categoryRepository.count(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

async function getTree({ publicOnly = true } = {}) {
  const filter = publicOnly ? { status: 'active' } : {};
  const categories = await categoryRepository.findAll(filter, {
    sort: { sortOrder: 1, name: 1 },
  });
  return buildTree(categories);
}

async function getBySlug(slug) {
  const category = await categoryRepository.findBySlug(slug);
  if (!category || category.status === 'inactive') {
    throw ApiError.notFound('Category not found');
  }
  return category;
}

async function getById(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

async function create(payload) {
  const slug = await ensureUniqueSlug(payload.slug || payload.name);
  const data = flattenSeo(payload);
  if (data.parentId) {
    const parent = await categoryRepository.findById(data.parentId);
    if (!parent) throw ApiError.badRequest('Parent category not found');
  }
  return categoryRepository.create({ ...data, slug });
}

async function update(id, payload) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const data = flattenSeo(payload);
  if (payload.slug || payload.name) {
    data.slug = await ensureUniqueSlug(payload.slug || payload.name || category.name, id);
  }
  if (data.parentId) {
    if (data.parentId === parseId(id)) {
      throw ApiError.badRequest('Category cannot be its own parent');
    }
    const parent = await categoryRepository.findById(data.parentId);
    if (!parent) throw ApiError.badRequest('Parent category not found');
  }

  return categoryRepository.updateById(id, data);
}

async function softUpdateStatus(id, status) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Category not found');
  return categoryRepository.updateById(id, { status });
}

async function reorder(items = []) {
  const updates = items.map((item) =>
    categoryRepository.updateById(item.id, { sortOrder: item.sortOrder })
  );
  await Promise.all(updates);
  return getTree({ publicOnly: false });
}

async function remove(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const children = await categoryRepository.count({ parentId: parseId(id) });
  if (children > 0) {
    throw ApiError.badRequest('Cannot delete category with child categories; deactivate instead');
  }

  return categoryRepository.updateById(id, { status: 'inactive' });
}

module.exports = {
  list,
  getTree,
  getBySlug,
  getById,
  create,
  update,
  softUpdateStatus,
  reorder,
  remove,
  ensureUniqueSlug,
  buildTree,
};
