const { prisma } = require('../config/prisma');
const { sendEmailAsync } = require('../config/email');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const {
  VIP_ORDER_THRESHOLD,
  VIP_NEXT_ORDER_DISCOUNT_PERCENT,
  VIP_FREE_DELIVERY_ORDERS,
} = require('../config/vip');
const { vipUnlockedEmail } = require('../templates/vipUnlockedEmail');
const { vipEarlyAccessEmail } = require('../templates/vipEarlyAccessEmail');
const logger = require('../utils/logger');

const money = require('../utils/money');

const { round2 } = money;

/**
 * After a qualifying order (≥ $300 subtotal), unlock VIP and grant:
 * - 10% off pending for next order
 * - +5 free standard delivery credits
 */
async function grantVipRewardsForOrder({ userId, subtotal, orderNumber, tx = prisma }) {
  const amount = Number(subtotal) || 0;
  if (amount < VIP_ORDER_THRESHOLD) {
    return { granted: false };
  }

  const user = await tx.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      email: true,
      name: true,
      isVip: true,
      vipPendingDiscountPercent: true,
      freeDeliveryCredits: true,
    },
  });
  if (!user) return { granted: false };

  const wasVip = Boolean(user.isVip);
  const nextDiscount = Math.max(
    Number(user.vipPendingDiscountPercent) || 0,
    VIP_NEXT_ORDER_DISCOUNT_PERCENT
  );
  const nextCredits =
    (Number(user.freeDeliveryCredits) || 0) + VIP_FREE_DELIVERY_ORDERS;

  const updated = await tx.user.update({
    where: { id: user.id },
    data: {
      isVip: true,
      vipEarlyAccess: true,
      vipUnlockedAt: wasVip ? undefined : new Date(),
      vipPendingDiscountPercent: nextDiscount,
      freeDeliveryCredits: nextCredits,
      // Show congratulations popup once for newly unlocked VIPs
      ...(wasVip ? {} : { vipCongratsSeen: false }),
    },
  });

  return {
    granted: true,
    wasVip,
    isNewVip: !wasVip,
    user: updated,
    orderNumber,
    discountPercent: VIP_NEXT_ORDER_DISCOUNT_PERCENT,
    freeDeliveryCredits: nextCredits,
    creditsAdded: VIP_FREE_DELIVERY_ORDERS,
  };
}

function notifyVipUnlocked(reward) {
  if (!reward?.granted || !reward.user?.email) return;
  try {
    const html = vipUnlockedEmail({
      name: reward.user.name,
      wasVip: reward.wasVip,
      discountPercent: reward.discountPercent,
      freeDeliveryCredits: reward.freeDeliveryCredits,
      creditsAdded: reward.creditsAdded,
      orderNumber: reward.orderNumber,
      threshold: VIP_ORDER_THRESHOLD,
      shopUrl: env.STOREFRONT_URL,
    });
    sendEmailAsync({
      to: reward.user.email,
      subject: reward.wasVip
        ? 'Scosha VIP — more rewards added to your account'
        : 'Welcome to Scosha VIP',
      html,
    });
  } catch (err) {
    logger.warn(`VIP unlock email failed: ${err.message}`);
  }
}

/**
 * Apply pending VIP % discount and/or free-delivery credit on checkout.
 * Does not mutate the user yet — call consumeVipCheckoutPerks after order create.
 */
function resolveVipCheckoutPerks(user, { subtotal, shippingCharge, deliveryMethod, couponDiscount }) {
  const pendingPct = Number(user?.vipPendingDiscountPercent) || 0;
  let vipDiscount = 0;
  if (pendingPct > 0) {
    vipDiscount = money.percentOf(subtotal, pendingPct);
  }

  // Prefer the larger of coupon vs VIP % (do not stack)
  const coupon = Number(couponDiscount) || 0;
  let appliedVipDiscount = 0;
  let appliedCouponDiscount = coupon;
  if (vipDiscount > coupon) {
    appliedVipDiscount = vipDiscount;
    appliedCouponDiscount = 0;
  }

  let finalShipping = Number(shippingCharge) || 0;
  let usedFreeDeliveryCredit = false;
  const credits = Number(user?.freeDeliveryCredits) || 0;
  if (
    deliveryMethod === 'standard' &&
    credits > 0 &&
    finalShipping > 0
  ) {
    finalShipping = 0;
    usedFreeDeliveryCredit = true;
  }

  return {
    vipDiscount: appliedVipDiscount,
    couponDiscount: appliedCouponDiscount,
    clearPendingDiscount: appliedVipDiscount > 0,
    shippingCharge: finalShipping,
    usedFreeDeliveryCredit,
    vipPendingDiscountPercent: pendingPct,
    freeDeliveryCredits: credits,
  };
}

async function consumeVipCheckoutPerks(userId, { clearPendingDiscount, usedFreeDeliveryCredit }, tx = prisma) {
  if (!clearPendingDiscount && !usedFreeDeliveryCredit) return;

  const data = {};
  if (clearPendingDiscount) data.vipPendingDiscountPercent = 0;
  if (usedFreeDeliveryCredit) {
    data.freeDeliveryCredits = { decrement: 1 };
  }

  await tx.user.update({
    where: { id: Number(userId) },
    data,
  });
}

async function notifyVipEarlyAccessProduct(product) {
  if (!product?.vipEarlyAccess || product.status !== 'active') return;

  const vips = await prisma.user.findMany({
    where: { isVip: true, vipEarlyAccess: true, status: 'active' },
    select: { email: true, name: true },
  });
  if (!vips.length) return;

  const link = `${env.STOREFRONT_URL}/product/${product.slug}`;
  for (const vip of vips) {
    if (!vip.email) continue;
    try {
      sendEmailAsync({
        to: vip.email,
        subject: `VIP early access: ${product.name}`,
        html: vipEarlyAccessEmail({
          name: vip.name,
          productName: product.name,
          productUrl: link,
          shopUrl: env.STOREFRONT_URL,
        }),
      });
    } catch (err) {
      logger.warn(`VIP early-access email failed for ${vip.email}: ${err.message}`);
    }
  }
}

async function notifyVipEarlyAccessCollection(collection) {
  if (!collection || collection.accessLevel !== 'vip_early_access' || collection.status !== 'active') {
    return;
  }

  const vips = await prisma.user.findMany({
    where: { isVip: true, vipEarlyAccess: true, status: 'active' },
    select: { email: true, name: true },
  });
  if (!vips.length) return;

  const link = `${env.STOREFRONT_URL}/shop?collection=${encodeURIComponent(collection.slug)}`;
  for (const vip of vips) {
    if (!vip.email) continue;
    try {
      sendEmailAsync({
        to: vip.email,
        subject: `VIP early access: ${collection.title}`,
        html: vipEarlyAccessEmail({
          name: vip.name,
          productName: collection.title,
          productUrl: link,
          shopUrl: env.STOREFRONT_URL,
        }),
      });
    } catch (err) {
      logger.warn(`VIP collection email failed for ${vip.email}: ${err.message}`);
    }
  }
}

/**
 * Public VIP eligibility check — intentionally minimal (no PII beyond boolean + copy).
 */
async function checkVipByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw ApiError.badRequest('Valid email is required');
  }

  const user = await prisma.user.findFirst({
    where: { email: normalized },
    select: { isVip: true, status: true },
  });

  if (user?.isVip && user.status === 'active') {
    return {
      isVip: true,
      canLogin: true,
      message:
        'Welcome back — your email is registered as a Scosha VIP. Log in to unlock exclusive benefits and early access.',
      qualifyHint: null,
    };
  }

  return {
    isVip: false,
    canLogin: Boolean(user),
    message: user
      ? 'This account isn’t a VIP member yet. Spend $300 or more in a single order to join Private Access.'
      : 'This email isn’t registered as VIP. Spend $300 or more in one order to become a Scosha VIP.',
    qualifyHint:
      'VIP terms: one order of $300+ unlocks membership. Benefits include 10% off your next order, 5 free deliveries, and early access to exclusive collections.',
  };
}

async function acknowledgeCongrats(userId) {
  await prisma.user.update({
    where: { id: Number(userId) },
    data: { vipCongratsSeen: true },
  });
  return { ok: true };
}

async function getVipStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      isVip: true,
      vipUnlockedAt: true,
      vipPendingDiscountPercent: true,
      freeDeliveryCredits: true,
      vipCongratsSeen: true,
      vipEarlyAccess: true,
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  return {
    ...user,
    threshold: VIP_ORDER_THRESHOLD,
    nextOrderDiscountPercent: VIP_NEXT_ORDER_DISCOUNT_PERCENT,
    freeDeliveryPackSize: VIP_FREE_DELIVERY_ORDERS,
  };
}

/** Manual admin grant / revoke / adjust benefits */
async function adminUpdateVip(userId, payload = {}, adminId, req) {
  const id = Number(userId);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('Customer not found');

  const data = {};
  if (payload.isVip !== undefined) {
    data.isVip = Boolean(payload.isVip);
    if (payload.isVip && !user.isVip) {
      data.vipUnlockedAt = new Date();
      data.vipCongratsSeen = false;
      data.vipEarlyAccess = true;
      if (!user.vipPendingDiscountPercent) {
        data.vipPendingDiscountPercent = VIP_NEXT_ORDER_DISCOUNT_PERCENT;
      }
      if (!(Number(user.freeDeliveryCredits) > 0)) {
        data.freeDeliveryCredits = VIP_FREE_DELIVERY_ORDERS;
      }
    }
    if (!payload.isVip) {
      data.vipPendingDiscountPercent = 0;
      data.vipEarlyAccess = false;
    }
  }
  if (payload.vipPendingDiscountPercent !== undefined) {
    data.vipPendingDiscountPercent = Math.max(0, Math.min(100, Number(payload.vipPendingDiscountPercent) || 0));
  }
  if (payload.freeDeliveryCredits !== undefined) {
    data.freeDeliveryCredits = Math.max(0, Number(payload.freeDeliveryCredits) || 0);
  }
  if (payload.vipEarlyAccess !== undefined) {
    data.vipEarlyAccess = Boolean(payload.vipEarlyAccess);
  }
  if (payload.resetCongrats === true) {
    data.vipCongratsSeen = false;
  }

  const updated = await prisma.user.update({ where: { id }, data });

  try {
    const { logAdminAction } = require('../utils/audit');
    await logAdminAction(adminId, 'update', 'CustomerVIP', id, user, updated, req);
  } catch {
    /* audit optional */
  }

  return updated;
}

async function adminBroadcastEarlyAccess({ productId, collectionId }) {
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) throw ApiError.notFound('Product not found');
    await notifyVipEarlyAccessProduct({ ...product, vipEarlyAccess: true, status: 'active' });
    return { sent: true, type: 'product', id: product.id };
  }
  if (collectionId) {
    const collection = await prisma.collection.findUnique({ where: { id: Number(collectionId) } });
    if (!collection) throw ApiError.notFound('Collection not found');
    await notifyVipEarlyAccessCollection({
      ...collection,
      accessLevel: 'vip_early_access',
      status: 'active',
    });
    return { sent: true, type: 'collection', id: collection.id };
  }
  throw ApiError.badRequest('productId or collectionId is required');
}

module.exports = {
  VIP_ORDER_THRESHOLD,
  VIP_NEXT_ORDER_DISCOUNT_PERCENT,
  VIP_FREE_DELIVERY_ORDERS,
  grantVipRewardsForOrder,
  notifyVipUnlocked,
  resolveVipCheckoutPerks,
  consumeVipCheckoutPerks,
  notifyVipEarlyAccessProduct,
  notifyVipEarlyAccessCollection,
  checkVipByEmail,
  acknowledgeCongrats,
  getVipStatus,
  adminUpdateVip,
  adminBroadcastEarlyAccess,
};
