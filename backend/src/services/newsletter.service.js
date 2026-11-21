const { prisma } = require('../config/prisma');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { buildExport } = require('../utils/export');

async function subscribe(email) {
  const existing = await prisma.newsletter.findUnique({ where: { email } });
  if (existing) {
    if (existing.status === 'subscribed') {
      return { alreadySubscribed: true, subscriber: existing };
    }
    const subscriber = await prisma.newsletter.update({
      where: { id: existing.id },
      data: { status: 'subscribed', subscribedAt: new Date() },
    });
    return { alreadySubscribed: false, subscriber };
  }

  const subscriber = await prisma.newsletter.create({
    data: { email, status: 'subscribed' },
  });
  return { alreadySubscribed: false, subscriber };
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-subscribedAt'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) where.email = { contains: query.q };

  const [data, total] = await Promise.all([
    prisma.newsletter.findMany({ where, orderBy, skip, take: limit }),
    prisma.newsletter.count({ where }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

async function exportSubscribers(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;
  else where.status = 'subscribed';

  const rows = await prisma.newsletter.findMany({
    where,
    orderBy: { subscribedAt: 'desc' },
  });

  const columns = [
    { header: 'Email', key: 'email' },
    { header: 'Status', key: 'status' },
    {
      header: 'Subscribed At',
      key: 'subscribedAt',
      value: (r) => (r.subscribedAt ? new Date(r.subscribedAt).toISOString() : ''),
    },
  ];

  return buildExport({
    format: query.format || 'csv',
    rows,
    columns,
    title: 'Newsletter Subscribers',
    sheetName: 'Subscribers',
  });
}

module.exports = { subscribe, listAdmin, exportSubscribers };
