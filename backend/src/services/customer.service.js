const crypto = require('crypto');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { USER_STATUS } = require('../constants/commerce');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { withLegacyId } = require('../utils/prismaHelpers');
const { logAdminAction } = require('../utils/audit');
const { PAID_STATUSES } = require('./dashboard.service');

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isEmailVerified: true,
  roleId: true,
  status: true,
  lastLogin: true,
  avatar: true,
  isVip: true,
  vipUnlockedAt: true,
  vipPendingDiscountPercent: true,
  freeDeliveryCredits: true,
  vipCongratsSeen: true,
  vipEarlyAccess: true,
  createdAt: true,
  updatedAt: true,
};

function num(v) {
  if (v == null) return 0;
  return Number(v);
}

function mapCustomer(user, extras = {}) {
  return withLegacyId({ ...user, ...extras });
}

async function list(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, '-createdAt'));
  // Anonymized accounts stay out of the customer list unless explicitly requested.
  const where = { status: query.status || { not: USER_STATUS.DELETED } };
  if (query.isVip === 'true' || query.isVip === true) where.isVip = true;
  if (query.isVip === 'false' || query.isVip === false) where.isVip = false;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { email: { contains: query.q } },
      { phone: { contains: query.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_SAFE_SELECT, orderBy, skip, take: limit }),
    prisma.user.count({ where }),
  ]);

  const ids = rows.map((u) => u.id);
  const [orderGroups, spentGroups] = ids.length
    ? await Promise.all([
        prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: ids } },
          _count: { _all: true },
        }),
        prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, status: { in: PAID_STATUSES } },
          _sum: { total: true },
        }),
      ])
    : [[], []];

  const orderCountMap = new Map(orderGroups.map((g) => [g.userId, g._count._all]));
  const spentMap = new Map(spentGroups.map((g) => [g.userId, num(g._sum.total)]));

  const data = rows.map((u) =>
    mapCustomer(u, {
      ordersCount: orderCountMap.get(u.id) || 0,
      totalSpent: spentMap.get(u.id) || 0,
    })
  );

  return paginatedResponse(data, total, page, limit);
}

async function getById(id) {
  const userId = Number(id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_SELECT,
  });
  if (!user) throw ApiError.notFound('Customer not found');

  const [orders, addresses, ordersCount, spentAgg] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.address.findMany({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.order.aggregate({
      where: { userId, status: { in: PAID_STATUSES } },
      _sum: { total: true },
    }),
  ]);

  const totalSpent = num(spentAgg._sum.total);

  return mapCustomer(user, {
    addresses,
    recentOrders: orders.map((o) => ({
      ...o,
      subtotal: num(o.subtotal),
      total: num(o.total),
      couponDiscount: num(o.couponDiscount),
      shippingCharge: num(o.shippingCharge),
      tax: num(o.tax),
    })),
    ordersCount,
    totalSpent,
    stats: {
      ordersCount,
      totalSpent,
    },
  });
}

async function remove(id, adminId, req) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw ApiError.badRequest('Invalid customer id');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_SELECT,
  });
  if (!user) throw ApiError.notFound('Customer not found');

  const mode = await prisma.$transaction(async (tx) => {
    const orderCount = await tx.order.count({ where: { userId } });

    // Cart, wishlist, addresses and activity are personal data with no financial meaning.
    const carts = await tx.cart.findMany({ where: { userId }, select: { id: true } });
    if (carts.length) {
      const cartIds = carts.map((c) => c.id);
      await tx.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
      await tx.cart.deleteMany({ where: { id: { in: cartIds } } });
    }
    const wishlists = await tx.wishlist.findMany({ where: { userId }, select: { id: true } });
    if (wishlists.length) {
      const wishlistIds = wishlists.map((w) => w.id);
      await tx.wishlistItem.deleteMany({ where: { wishlistId: { in: wishlistIds } } });
      await tx.wishlist.deleteMany({ where: { id: { in: wishlistIds } } });
    }
    await tx.address.deleteMany({ where: { userId } });
    await tx.activityLog.deleteMany({ where: { userId } });

    if (orderCount === 0) {
      await tx.review.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      return 'deleted';
    }

    // Orders are financial records (revenue, stock movements, invoices). They are never
    // deleted; the account is anonymized instead so reports stay truthful.
    await tx.review.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        name: `Deleted customer #${userId}`,
        email: null,
        phone: null,
        googleId: null,
        avatar: null,
        passwordHash: `deleted:${crypto.randomUUID()}`,
        refreshTokenHash: null,
        tokenVersion: { increment: 1 },
        otpCode: null,
        otpExpiry: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        gender: null,
        preferredSize: null,
        status: USER_STATUS.DELETED,
        isVip: false,
        vipPendingDiscountPercent: 0,
        freeDeliveryCredits: 0,
      },
    });
    await tx.order.updateMany({
      where: { userId },
      data: { shipEmail: null },
    });
    return 'anonymized';
  });

  await logAdminAction(adminId, 'delete', 'Customer', userId, user, { mode }, req);
  return { id: userId, _id: userId, mode };
}

module.exports = { list, getById, remove };
