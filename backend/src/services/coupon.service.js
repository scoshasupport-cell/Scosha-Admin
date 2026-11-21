const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

function num(v) {
  if (v == null) return v;
  return Number(v);
}

function mapCoupon(coupon) {
  if (!coupon) return coupon;
  return {
    ...coupon,
    value: num(coupon.value),
    minOrder: num(coupon.minOrder),
    maxDiscount: num(coupon.maxDiscount),
  };
}

function computeDiscount(coupon, subtotal) {
  const value = num(coupon.value) || 0;
  const maxDiscount = coupon.maxDiscount != null ? num(coupon.maxDiscount) : null;
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (subtotal * value) / 100;
    if (maxDiscount != null) {
      discount = Math.min(discount, maxDiscount);
    }
  } else {
    discount = value;
  }
  return Math.max(0, Math.min(discount, subtotal));
}

async function validateCoupon({ code, subtotal }) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: String(code).toUpperCase().trim() },
  });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  if (coupon.status !== 'active') throw ApiError.badRequest('Coupon is inactive');

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw ApiError.badRequest('Coupon is not yet valid');
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw ApiError.badRequest('Coupon has expired');
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('Coupon usage limit reached');
  }
  const minOrder = num(coupon.minOrder) || 0;
  if (subtotal < minOrder) {
    throw ApiError.badRequest(`Minimum order amount is ${minOrder}`);
  }

  const discount = computeDiscount(coupon, subtotal);
  return {
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: num(coupon.value),
    discount,
    minOrder,
    maxDiscount: num(coupon.maxDiscount),
    couponId: coupon.id,
  };
}

async function list(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) where.code = { contains: query.q };

  const [data, total] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy, skip, take: limit }),
    prisma.coupon.count({ where }),
  ]);
  return paginatedResponse(data.map(mapCoupon), total, page, limit);
}

async function getById(id) {
  const coupon = await prisma.coupon.findUnique({ where: { id: Number(id) } });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  return mapCoupon(coupon);
}

async function create(payload, adminId, req) {
  const code = String(payload.code).toUpperCase().trim();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw ApiError.conflict('Coupon code already exists');

  const coupon = await prisma.coupon.create({
    data: {
      ...payload,
      code,
    },
  });
  const mapped = mapCoupon(coupon);
  await logAdminAction(adminId, 'create', 'Coupon', coupon.id, null, mapped, req);
  return mapped;
}

async function update(id, payload, adminId, req) {
  const coupon = await prisma.coupon.findUnique({ where: { id: Number(id) } });
  if (!coupon) throw ApiError.notFound('Coupon not found');

  if (payload.code && payload.code !== coupon.code) {
    const code = String(payload.code).toUpperCase().trim();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw ApiError.conflict('Coupon code already exists');
    payload = { ...payload, code };
  }

  const before = mapCoupon(coupon);
  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: payload,
  });
  const after = mapCoupon(updated);
  await logAdminAction(adminId, 'update', 'Coupon', coupon.id, before, after, req);
  return after;
}

async function remove(id, adminId, req) {
  const coupon = await prisma.coupon.findUnique({ where: { id: Number(id) } });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  const before = mapCoupon(coupon);
  await prisma.coupon.delete({ where: { id: coupon.id } });
  await logAdminAction(adminId, 'delete', 'Coupon', id, before, null, req);
  return { deleted: true, id: coupon.id };
}

module.exports = {
  validateCoupon,
  computeDiscount,
  list,
  getById,
  create,
  update,
  remove,
};
