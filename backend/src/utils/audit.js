const { prisma } = require('../config/prisma');
const logger = require('./logger');

/**
 * Persist an admin audit trail entry.
 * @param {number|string|null} adminId
 * @param {string} action
 * @param {string} entity
 * @param {number|string|null} entityId
 * @param {*} before
 * @param {*} after
 * @param {import('express').Request} [req]
 */
async function logAdminAction(adminId, action, entity, entityId = null, before = null, after = null, req = null) {
  try {
    const adminIdNum = adminId != null && adminId !== '' ? Number(adminId) : null;
    const entityIdNum = entityId != null && entityId !== '' ? Number(entityId) : null;

    await prisma.auditLog.create({
      data: {
        adminId: Number.isInteger(adminIdNum) && adminIdNum > 0 ? adminIdNum : null,
        action,
        entity,
        entityId: Number.isInteger(entityIdNum) && entityIdNum > 0 ? entityIdNum : null,
        before: before ?? undefined,
        after: after ?? undefined,
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
        userAgent: req?.headers?.['user-agent'] || undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to write audit log', { message: error.message, action, entity });
  }
}

module.exports = { logAdminAction };
