const { prisma } = require('../config/prisma');
const { sendEmail } = require('../config/email');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

async function create(payload) {
  return prisma.contactMessage.create({ data: payload });
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { email: { contains: query.q } },
      { subject: { contains: query.q } },
      { message: { contains: query.q } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy, skip, take: limit }),
    prisma.contactMessage.count({ where }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

async function getById(id) {
  const message = await prisma.contactMessage.findUnique({ where: { id: Number(id) } });
  if (!message) throw ApiError.notFound('Contact message not found');
  return message;
}

async function markRead(id, adminId, req) {
  const message = await prisma.contactMessage.findUnique({ where: { id: Number(id) } });
  if (!message) throw ApiError.notFound('Contact message not found');
  if (message.status === 'new') {
    const before = { ...message };
    const updated = await prisma.contactMessage.update({
      where: { id: message.id },
      data: { status: 'read' },
    });
    await logAdminAction(adminId, 'mark_read', 'ContactMessage', message.id, before, updated, req);
    return updated;
  }
  return message;
}

async function reply(id, replyText, adminId, req) {
  const message = await prisma.contactMessage.findUnique({ where: { id: Number(id) } });
  if (!message) throw ApiError.notFound('Contact message not found');
  const before = { ...message };
  const updated = await prisma.contactMessage.update({
    where: { id: message.id },
    data: { reply: replyText, status: 'replied' },
  });

  await sendEmail({
    to: updated.email,
    subject: `Re: ${updated.subject || 'Your message'}`,
    text: replyText,
    html: `<p>${replyText.replace(/\n/g, '<br>')}</p>`,
  });

  await logAdminAction(adminId, 'reply', 'ContactMessage', message.id, before, updated, req);
  return updated;
}

module.exports = { create, listAdmin, getById, markRead, reply };
