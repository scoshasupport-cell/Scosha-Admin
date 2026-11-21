const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');

async function listForAdmin(adminId, query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = { recipientType: 'admin', recipientId: Number(adminId) };
  if (query.isRead === 'true') where.isRead = true;
  if (query.isRead === 'false') where.isRead = false;

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy, skip, take: limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { recipientType: 'admin', recipientId: Number(adminId), isRead: false },
    }),
  ]);

  const result = paginatedResponse(data, total, page, limit);
  result.meta.unreadCount = unreadCount;
  return result;
}

async function markRead(id, adminId) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: Number(id),
      recipientType: 'admin',
      recipientId: Number(adminId),
    },
  });
  if (!notification) throw ApiError.notFound('Notification not found');

  return prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
  });
}

async function markAllRead(adminId) {
  const result = await prisma.notification.updateMany({
    where: {
      recipientType: 'admin',
      recipientId: Number(adminId),
      isRead: false,
    },
    data: { isRead: true },
  });
  return { modifiedCount: result.count };
}

module.exports = { listForAdmin, markRead, markAllRead };
