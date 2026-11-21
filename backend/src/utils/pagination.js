function getPagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginatedResponse(data, total, page, limit) {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

function getSort(query = {}, defaultSort = '-createdAt') {
  const sort = query.sort || defaultSort;
  const sortObj = {};

  String(sort)
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
    .forEach((field) => {
      if (field.startsWith('-')) {
        sortObj[field.slice(1)] = -1;
      } else {
        sortObj[field] = 1;
      }
    });

  return sortObj;
}

/** Convert `{ field: -1|1 }` sort maps to Prisma `orderBy`. */
function toPrismaOrderBy(sortObj = {}) {
  const entries = Object.entries(sortObj);
  if (!entries.length) return undefined;
  return entries.map(([field, dir]) => ({
    [field]: dir === -1 || dir === 'desc' ? 'desc' : 'asc',
  }));
}

module.exports = {
  getPagination,
  paginatedResponse,
  getSort,
  toPrismaOrderBy,
};
