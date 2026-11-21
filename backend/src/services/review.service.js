const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

const PAID_LIKE = ['delivered', 'confirmed', 'processing', 'shipped'];

function num(v) {
  if (v == null) return v;
  return Number(v);
}

function mapUser(user) {
  if (!user) return user;
  return { _id: user.id, id: user.id, name: user.name, email: user.email, avatar: user.avatar };
}

function mapProduct(product) {
  if (!product) return product;
  return {
    _id: product.id,
    id: product.id,
    name: product.name,
    slug: product.slug,
    images: product.images,
  };
}

function mapReview(review) {
  if (!review) return review;
  const { user, product, adminReply, adminReplyAt, ...rest } = review;
  return {
    ...rest,
    adminReply:
      adminReply != null
        ? { text: adminReply, at: adminReplyAt }
        : adminReplyAt
          ? { text: null, at: adminReplyAt }
          : undefined,
    userId: user ? mapUser(user) : rest.userId,
    productId: product ? mapProduct(product) : rest.productId,
  };
}

async function recalcProductRating(productId) {
  const pid = Number(productId);
  const stats = await prisma.review.aggregate({
    where: { productId: pid, status: 'approved' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const ratingAvg = stats._avg.rating != null ? Math.round(num(stats._avg.rating) * 10) / 10 : 0;
  const reviewCount = stats._count._all || 0;

  await prisma.product.update({
    where: { id: pid },
    data: { ratingAvg, reviewCount },
  });
  return { ratingAvg, reviewCount };
}

async function listPublic(query = {}) {
  const productId = query.productId;
  if (!productId) throw ApiError.badRequest('productId is required');

  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = { productId: Number(productId), status: 'approved' };

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return paginatedResponse(data.map(mapReview), total, page, limit);
}

async function listAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  const where = {};
  if (query.status) where.status = query.status;
  if (query.productId) where.productId = Number(query.productId);
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { text: { contains: query.q } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        product: { select: { id: true, name: true, slug: true, images: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return paginatedResponse(data.map(mapReview), total, page, limit);
}

async function create(userId, payload) {
  const productId = Number(payload.productId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  let verifiedPurchase = false;
  if (payload.orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: Number(payload.orderId),
        userId: Number(userId),
        status: { in: PAID_LIKE },
        items: { some: { productId } },
      },
    });
    verifiedPurchase = Boolean(order);
  }

  const review = await prisma.review.create({
    data: {
      productId,
      userId: Number(userId),
      orderId: payload.orderId != null ? Number(payload.orderId) : null,
      rating: payload.rating,
      title: payload.title,
      text: payload.text,
      images: payload.images,
      status: 'pending',
      verifiedPurchase,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      product: { select: { id: true, name: true, slug: true } },
    },
  });

  return mapReview(review);
}

async function updateOwn(id, userId, payload) {
  const review = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.userId) !== String(userId)) {
    throw ApiError.forbidden('You can only edit your own reviews');
  }

  const wasApproved = review.status === 'approved';
  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.text !== undefined ? { text: payload.text } : {}),
      ...(payload.images !== undefined ? { images: payload.images } : {}),
      status: 'pending',
    },
  });

  if (wasApproved) await recalcProductRating(review.productId);
  return mapReview(updated);
}

async function deleteOwn(id, userId) {
  const review = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.userId) !== String(userId)) {
    throw ApiError.forbidden('You can only delete your own reviews');
  }

  const productId = review.productId;
  const wasApproved = review.status === 'approved';
  await prisma.review.delete({ where: { id: review.id } });
  if (wasApproved) await recalcProductRating(productId);
  return { deleted: true, id: review.id };
}

async function setStatus(id, status, adminId, req) {
  const review = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!review) throw ApiError.notFound('Review not found');

  const before = mapReview(review);
  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { status },
  });
  await recalcProductRating(review.productId);
  const after = mapReview(updated);
  await logAdminAction(adminId, status, 'Review', review.id, before, after, req);
  return after;
}

async function reply(id, text, adminId, req) {
  const review = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!review) throw ApiError.notFound('Review not found');

  const before = mapReview(review);
  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { adminReply: text, adminReplyAt: new Date() },
  });
  const after = mapReview(updated);
  await logAdminAction(adminId, 'reply', 'Review', review.id, before, after, req);
  return after;
}

module.exports = {
  listPublic,
  listAdmin,
  create,
  updateOwn,
  deleteOwn,
  setStatus,
  reply,
  recalcProductRating,
};
