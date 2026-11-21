const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort } = require('../utils/pagination');
const { env } = require('../config/env');
const { sendEmailAsync } = require('../config/email');
const { orderAdminEmail } = require('../templates/orderAdminEmail');
const { orderConfirmationEmail } = require('../templates/orderConfirmationEmail');
const { generateInvoicePdf, generatePackingSlipPdf } = require('../utils/invoice');
const logger = require('../utils/logger');
const { parseId, toOrderBy, toNumber, mapOrder } = require('../utils/prismaHelpers');
const money = require('../utils/money');
const { canTransitionOrderStatus } = require('../constants/commerce');
const { claimStock, releaseStock, stockUnavailableError } = require('./inventory.service');
const {
  grantVipRewardsForOrder,
  notifyVipUnlocked,
  resolveVipCheckoutPerks,
  consumeVipCheckoutPerks,
  VIP_ORDER_THRESHOLD,
} = require('./vip.service');

const ORDER_INCLUDE = {
  items: true,
  timeline: { orderBy: { at: 'asc' } },
};

/** Slim list payload — detail endpoints keep full ORDER_INCLUDE */
const ORDER_LIST_INCLUDE = {
  items: {
    select: {
      id: true,
      name: true,
      quantity: true,
      unitPrice: true,
      imageUrl: true,
      color: true,
      size: true,
    },
  },
};

const ORDER_ADMIN_LIST_INCLUDE = {
  ...ORDER_LIST_INCLUDE,
  user: { select: { id: true, name: true, email: true, phone: true } },
};

const ORDER_ADMIN_INCLUDE = {
  ...ORDER_INCLUDE,
  user: { select: { id: true, name: true, email: true, phone: true } },
};

const round2 = money.round2;

/**
 * Test-only seam: lets the integration suite force a failure after stock has been
 * claimed inside the checkout transaction, to prove the rollback. Never set in production.
 */
const checkoutTestHooks = { afterStockClaim: null };

const WRITE_CONFLICT_CODES = new Set(['P2034']); // InnoDB deadlock / write conflict (whole tx rolled back)

/**
 * Re-run a whole transaction when InnoDB aborts it with a deadlock. The transaction body
 * re-reads cart and stock on every attempt, so a retry can never double-claim anything.
 */
async function withWriteConflictRetry(run, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!WRITE_CONFLICT_CODES.has(error?.code) || attempt === attempts) throw error;
      logger.warn('Checkout transaction hit a write conflict; retrying', {
        attempt,
        code: error.code,
      });
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt + Math.random() * 50));
    }
  }
  throw lastError;
}

function generateOrderNumber() {
  const crypto = require('crypto');
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomInt(100000, 999999);
  return `SCO-${y}${m}${d}-${rand}`;
}

async function getSettings(tx = prisma) {
  let settings = await tx.setting.findFirst();
  if (!settings) {
    settings = await tx.setting.create({ data: {} });
  }
  return settings;
}

function resolveTaxRate(settings) {
  const taxes = settings?.taxes || {};
  const rate = taxes.rate ?? env.TAX_RATE ?? 0;
  if (taxes.included) return 0;
  return Number(rate) || 0;
}

function computeShipping(subtotal, deliveryMethod, settings) {
  const shipping = settings?.shipping || {};
  const method = deliveryMethod || 'standard';

  if (method === 'express') {
    return {
      shippingCharge: round2(shipping.expressCharge ?? 25),
      eta: shipping.expressEta || 'Same day',
    };
  }

  const threshold = shipping.freeShippingThreshold ?? env.FREE_SHIPPING_THRESHOLD ?? 150;
  const standard = shipping.standardCharge ?? env.DEFAULT_SHIPPING_CHARGE ?? 9;
  const free = subtotal >= threshold;

  return {
    shippingCharge: free ? 0 : round2(standard),
    eta: shipping.standardEta || '3-5 business days',
    freeShippingApplied: free,
  };
}

async function loadCartForUser(userId, tx = prisma) {
  const cart = await tx.cart.findUnique({
    where: { userId: parseId(userId) },
    include: { items: true },
  });

  if (!cart || !cart.items?.length) {
    throw ApiError.badRequest('Cart is empty', null, 'CART_EMPTY');
  }

  return cart;
}

async function loadAddressForUser(userId, addressId, tx = prisma) {
  const address = await tx.address.findFirst({
    where: { id: parseId(addressId), userId: parseId(userId) },
  });

  if (!address) {
    throw ApiError.notFound('Address not found', 'ADDRESS_NOT_FOUND');
  }

  return address;
}

async function buildLineItems(cartItems, tx = prisma) {
  const variantIds = cartItems.map((i) => parseId(i.variantId)).filter(Boolean);
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const productIds = [
    ...new Set(cartItems.map((i) => parseId(i.productId)).filter(Boolean)),
  ];
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = [];
  let subtotalCents = 0;

  for (const cartItem of cartItems) {
    const variant = variantMap.get(parseId(cartItem.variantId));
    if (!variant) {
      throw ApiError.badRequest(
        'One or more cart items are no longer available',
        null,
        'ITEM_UNAVAILABLE'
      );
    }
    if (variant.status !== 'active') {
      throw ApiError.badRequest(`Variant ${variant.sku} is not available`, null, 'ITEM_UNAVAILABLE');
    }
    if (variant.stock < cartItem.quantity) {
      throw stockUnavailableError(variant.sku, variant.stock, cartItem.quantity);
    }

    const product = productMap.get(parseId(cartItem.productId) || variant.productId);
    if (!product) {
      throw ApiError.badRequest('Product not found for a cart item', null, 'ITEM_UNAVAILABLE');
    }

    const colorName = cartItem.color || variant.colorName || '';
    const size = cartItem.size || variant.size || '';
    const variantImages = Array.isArray(variant.images) ? variant.images : [];
    const productImages = Array.isArray(product.images) ? product.images : [];
    const imageUrl = variantImages[0] || productImages[0] || '';
    const unitPrice = toNumber(variant.price);
    const unitCost = (() => {
      if (variant.costPrice != null) return toNumber(variant.costPrice);
      if (product.costPrice != null) return toNumber(product.costPrice);
      const ratio = Number(process.env.DEFAULT_COST_RATIO || 0.55);
      return money.applyRate(unitPrice, ratio);
    })();
    const lineTotal = money.lineTotal(unitPrice, cartItem.quantity);
    subtotalCents += money.toCents(lineTotal);

    items.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      sku: variant.sku,
      color: colorName,
      size,
      unitPrice,
      unitCost,
      comparePrice:
        variant.comparePrice != null
          ? toNumber(variant.comparePrice)
          : product.comparePrice != null
            ? toNumber(product.comparePrice)
            : null,
      quantity: cartItem.quantity,
      imageUrl,
      weight:
        variant.weight != null
          ? toNumber(variant.weight)
          : toNumber(product.weight, 0),
      categoryId: product.categoryId,
      lineTotal,
    });
  }

  return { items, subtotal: money.fromCents(subtotalCents) };
}

function parseJsonIdArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [];
}

async function resolveCouponDiscount({ couponCode, subtotal, items, userId, tx = prisma }) {
  if (!couponCode) {
    return { coupon: null, couponCode: null, couponDiscount: 0 };
  }

  const code = String(couponCode).trim().toUpperCase();
  const coupon = await tx.coupon.findUnique({ where: { code } });

  if (!coupon || coupon.status !== 'active') {
    throw ApiError.badRequest('Invalid or inactive coupon', null, 'COUPON_INVALID');
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw ApiError.badRequest('Coupon is not active yet', null, 'COUPON_INVALID');
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw ApiError.badRequest('Coupon has expired', null, 'COUPON_EXPIRED');
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('Coupon usage limit reached', null, 'COUPON_LIMIT_REACHED');
  }
  const minOrder = coupon.minOrder != null ? toNumber(coupon.minOrder) : 0;
  if (minOrder && subtotal < minOrder) {
    throw ApiError.badRequest(
      `Minimum order of $${minOrder} required for this coupon`,
      null,
      'COUPON_MIN_ORDER'
    );
  }

  if (coupon.perUserLimit != null && userId) {
    const usedByUser = await tx.order.count({
      where: {
        userId: parseId(userId),
        couponCode: coupon.code,
        status: { not: 'cancelled' },
      },
    });
    if (usedByUser >= coupon.perUserLimit) {
      throw ApiError.badRequest(
        'You have already used this coupon the maximum number of times',
        null,
        'COUPON_LIMIT_REACHED'
      );
    }
  }

  let eligibleSubtotal = subtotal;
  const applicableProductIds = parseJsonIdArray(coupon.applicableProductIds);
  const applicableCategoryIds = parseJsonIdArray(coupon.applicableCategoryIds);

  const sumEligible = (predicate) =>
    money.sum(...items.filter(predicate).map((i) => i.lineTotal));

  if (applicableProductIds.length) {
    const allowed = new Set(applicableProductIds);
    eligibleSubtotal = sumEligible((i) => allowed.has(String(i.productId)));
    if (eligibleSubtotal <= 0) {
      throw ApiError.badRequest(
        'Coupon does not apply to items in your cart',
        null,
        'COUPON_NOT_APPLICABLE'
      );
    }
  } else if (applicableCategoryIds.length) {
    const allowed = new Set(applicableCategoryIds);
    eligibleSubtotal = sumEligible((i) => allowed.has(String(i.categoryId)));
    if (eligibleSubtotal <= 0) {
      throw ApiError.badRequest(
        'Coupon does not apply to items in your cart',
        null,
        'COUPON_NOT_APPLICABLE'
      );
    }
  }

  const couponValue = toNumber(coupon.value);
  const maxDiscount = coupon.maxDiscount != null ? toNumber(coupon.maxDiscount) : null;

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = money.percentOf(eligibleSubtotal, couponValue);
    if (maxDiscount != null) {
      discount = money.min(discount, maxDiscount);
    }
  } else {
    discount = money.min(couponValue, eligibleSubtotal);
  }

  discount = money.min(discount, subtotal);

  return { coupon, couponCode: coupon.code, couponDiscount: discount };
}

function toShippingFields(address, user) {
  return {
    shipName: address.name,
    shipPhone: address.phone,
    shipEmail: address.email || user?.email || null,
    shipLine1: address.line1,
    shipLine2: address.line2 || null,
    shipCity: address.city,
    shipState: address.state,
    shipZip: address.zip,
    shipCountry: address.country,
  };
}

function toShippingAddress(address, user) {
  return {
    name: address.name,
    phone: address.phone,
    email: address.email || user?.email || '',
    line1: address.line1,
    line2: address.line2 || '',
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
  };
}

function stripInternalFields(items) {
  return items.map(({ categoryId, lineTotal, ...rest }) => rest);
}

async function computeCheckoutSummary({
  userId,
  addressId,
  deliveryMethod = 'standard',
  couponCode,
  tx = prisma,
}) {
  const settings = await getSettings(tx);
  const cart = await loadCartForUser(userId, tx);
  const address = await loadAddressForUser(userId, addressId, tx);
  const user = await tx.user.findUnique({
    where: { id: parseId(userId) },
    select: {
      id: true,
      email: true,
      name: true,
      isVip: true,
      vipPendingDiscountPercent: true,
      freeDeliveryCredits: true,
    },
  });
  const { items, subtotal } = await buildLineItems(cart.items, tx);
  const { coupon, couponCode: appliedCode, couponDiscount } = await resolveCouponDiscount({
    couponCode,
    subtotal,
    items,
    userId,
    tx,
  });

  const shippingInfo = computeShipping(subtotal, deliveryMethod, settings);
  const vipPerks = resolveVipCheckoutPerks(user, {
    subtotal,
    shippingCharge: shippingInfo.shippingCharge,
    deliveryMethod,
    couponDiscount,
  });

  const effectiveCouponDiscount = vipPerks.couponDiscount;
  const vipDiscount = vipPerks.vipDiscount;
  const totalDiscount = money.sum(effectiveCouponDiscount, vipDiscount);
  const taxable = money.max(0, money.subtract(subtotal, totalDiscount));
  const taxRate = resolveTaxRate(settings);
  const tax = money.applyRate(taxable, taxRate);
  const shippingCharge = round2(vipPerks.shippingCharge);
  const total = money.sum(taxable, shippingCharge, tax);

  // When VIP % wins over a typed coupon, do not consume the coupon
  const finalCouponCode = vipDiscount > 0 && effectiveCouponDiscount === 0 ? null : appliedCode;
  const finalCoupon = finalCouponCode ? coupon : null;

  return {
    cart,
    address,
    settings,
    user,
    coupon: finalCoupon,
    vipPerks,
    items,
    summary: {
      items: stripInternalFields(items),
      subtotal,
      shippingCharge,
      tax,
      couponCode: finalCouponCode || (vipDiscount > 0 ? 'VIP10' : null),
      couponDiscount: totalDiscount,
      total,
      deliveryMethod,
      eta: shippingInfo.eta,
      freeShippingApplied:
        shippingCharge === 0 && deliveryMethod === 'standard',
      vipDiscount,
      vipPendingDiscountPercent: vipPerks.vipPendingDiscountPercent,
      freeDeliveryCredits: vipPerks.freeDeliveryCredits,
      usedFreeDeliveryCredit: vipPerks.usedFreeDeliveryCredit,
      vipThreshold: VIP_ORDER_THRESHOLD,
      currency: settings.currency || 'USD',
    },
  };
}

async function previewCheckout({ userId, addressId, deliveryMethod, couponCode }) {
  const { address, summary } = await computeCheckoutSummary({
    userId,
    addressId,
    deliveryMethod,
    couponCode,
  });

  const user = await prisma.user.findUnique({
    where: { id: parseId(userId) },
    select: { email: true, name: true },
  });

  return {
    ...summary,
    shippingAddress: toShippingAddress(address, user),
  };
}

async function findAdminRecipientId(tx = prisma) {
  const admin = await tx.admin.findFirst({
    where: { status: 'active' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return admin?.id || null;
}

function notifyAdminOfNewOrder(orderId, orderNumber, total) {
  setImmediate(async () => {
    try {
      const adminId = await findAdminRecipientId();
      if (!adminId) return;
      await prisma.notification.create({
        data: {
          recipientType: 'admin',
          recipientId: adminId,
          title: 'New order placed',
          message: `Order ${orderNumber} totaling $${round2(total).toFixed(2)} (COD)`,
          type: 'order',
          data: { orderId, orderNumber },
          link: `/orders/${orderId}`,
        },
      });
    } catch (error) {
      logger.warn('Admin order notification failed', { orderId, message: error.message });
    }
  });
}

function sendOrderEmails(order, settings) {
  const adminTo = settings?.adminEmail || env.ADMIN_EMAIL;
  const customerTo = order.shippingAddress?.email || order.shipEmail;

  if (adminTo) {
    sendEmailAsync({
      to: adminTo,
      subject: `New COD Order ${order.orderNumber}`,
      html: orderAdminEmail(order, settings),
    });
  }

  if (customerTo) {
    // Generate PDF in the background so checkout latency stays low
    setImmediate(async () => {
      let attachments;
      try {
        const pdf = await generateInvoicePdf(order, settings);
        attachments = [
          {
            filename: `e-ticket-${order.orderNumber}.pdf`,
            content: pdf,
            contentType: 'application/pdf',
          },
        ];
      } catch (pdfErr) {
        logger.warn('Invoice PDF generation failed', { message: pdfErr.message });
      }

      sendEmailAsync({
        to: customerTo,
        subject: `Order Confirmation ${order.orderNumber}`,
        html: orderConfirmationEmail(order, settings),
        attachments,
      });
    });
  }
}

async function createOrder({ userId, addressId, deliveryMethod = 'standard', couponCode, notes }) {
  const uid = parseId(userId);
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }
  if (!user.isEmailVerified && !(user.phone && !user.email)) {
    throw ApiError.forbidden('Email verification required', null, 'EMAIL_NOT_VERIFIED');
  }

  let createdOrderId;
  let settingsForEmail;

  const txResult = await withWriteConflictRetry(() => prisma.$transaction(
    async (tx) => {
      // Serialize concurrent checkouts for the same customer so a double-click
      // cannot create two orders from one cart.
      const lockedCarts = await tx.$queryRaw`
        SELECT id FROM carts WHERE userId = ${uid} FOR UPDATE
      `;
      if (!Array.isArray(lockedCarts) || lockedCarts.length === 0) {
        throw ApiError.badRequest('Cart is empty', null, 'CART_EMPTY');
      }

      const { cart, address, settings, coupon, vipPerks, items, summary } = await computeCheckoutSummary({
        userId: uid,
        addressId,
        deliveryMethod,
        couponCode,
        tx,
      });
      settingsForEmail = settings;

      // Claim cart before creating the order so a second waiter sees empty.
      const claimed = await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (claimed.count === 0) {
        throw ApiError.badRequest('Cart is empty', null, 'CART_EMPTY');
      }

      if (coupon) {
        const couponUpdated = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            status: 'active',
            ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (couponUpdated.count === 0) {
          throw ApiError.badRequest('Coupon could not be applied', null, 'COUPON_LIMIT_REACHED');
        }
      }

      await consumeVipCheckoutPerks(
        uid,
        {
          clearPendingDiscount: vipPerks.clearPendingDiscount,
          usedFreeDeliveryCredit: vipPerks.usedFreeDeliveryCredit,
        },
        tx
      );

      let orderNumber = generateOrderNumber();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const exists = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true },
        });
        if (!exists) break;
        orderNumber = generateOrderNumber();
      }

      const now = new Date();
      const timelineNotes = ['Order placed'];
      if (summary.vipDiscount > 0) {
        timelineNotes.push(`VIP ${summary.vipPendingDiscountPercent || 10}% next-order discount applied`);
      }
      if (summary.usedFreeDeliveryCredit) {
        timelineNotes.push('VIP free delivery credit used');
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: uid,
          deliveryMethod: summary.deliveryMethod,
          shippingCharge: summary.shippingCharge,
          tax: summary.tax,
          couponCode: summary.couponCode || null,
          couponDiscount: summary.couponDiscount,
          subtotal: summary.subtotal,
          total: summary.total,
          status: 'pending',
          paymentMethod: 'COD',
          notes: notes || null,
          invoiceUrl: null,
          ...toShippingFields(address, user),
          timeline: {
            create: timelineNotes.map((note, idx) => ({
              status: 'pending',
              note,
              at: new Date(now.getTime() + idx),
            })),
          },
        },
      });

      createdOrderId = order.id;

      // Claim stock (exclusive row lock) BEFORE inserting order items. Order items hold a
      // foreign key to the variant, and InnoDB takes a shared lock on the parent row for
      // that FK check; two customers doing S-then-X on the same variant deadlock. Claiming
      // in ascending variant id order also keeps multi-item carts from locking in a cycle.
      const claimOrder = [...items].sort((a, b) => a.variantId - b.variantId);
      for (const item of claimOrder) {
        await claimStock(tx, item.variantId, item.quantity, {
          sku: item.sku,
          orderId: order.id,
        });
      }

      await tx.orderItem.createMany({
        data: stripInternalFields(items).map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku,
          color: item.color,
          size: item.size,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost ?? null,
          comparePrice: item.comparePrice,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          weight: item.weight,
        })),
      });

      if (typeof checkoutTestHooks.afterStockClaim === 'function' && !env.isProd) {
        await checkoutTestHooks.afterStockClaim({ tx, orderId: order.id, items });
      }

      const vipReward = await grantVipRewardsForOrder({
        userId: uid,
        subtotal: summary.subtotal,
        orderNumber,
        tx,
      });
      if (vipReward.granted) {
        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            status: 'pending',
            note: vipReward.wasVip
              ? `VIP rewards topped up (+5 free deliveries, 10% next order)`
              : `Customer unlocked VIP (order ≥ $${VIP_ORDER_THRESHOLD})`,
            at: new Date(),
          },
        });
      }

      return { vipReward, orderNumber, total: summary.total };
    },
    { timeout: 20_000 }
  ));

  const order = await prisma.order.findUnique({
    where: { id: createdOrderId },
    include: ORDER_INCLUDE,
  });
  const mapped = mapOrder(order);
  const settings = settingsForEmail || (await getSettings());
  // Side effects run after commit and are best-effort: a failing email or admin
  // notification must never undo or delay a placed order.
  sendOrderEmails(mapped, settings);
  notifyAdminOfNewOrder(order.id, txResult.orderNumber, txResult.total);
  if (txResult?.vipReward?.granted) {
    notifyVipUnlocked(txResult.vipReward);
  }

  const reward = txResult?.vipReward;
  return {
    ...mapped,
    vipUnlocked: Boolean(reward?.granted && reward?.isNewVip),
    vipReward: reward?.granted
      ? {
          granted: true,
          isNewVip: Boolean(reward.isNewVip),
          wasVip: Boolean(reward.wasVip),
          discountPercent: reward.discountPercent,
          creditsAdded: reward.creditsAdded,
          freeDeliveryCredits: reward.freeDeliveryCredits,
        }
      : null,
  };
}

async function listMyOrders(userId, query = {}) {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, '-createdAt');
  const filter = { userId: parseId(userId) };

  if (query.status) {
    filter.status = query.status;
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: filter,
      include: ORDER_LIST_INCLUDE,
      orderBy: toOrderBy(sort, { createdAt: 'desc' }),
      skip,
      take: limit,
    }),
    prisma.order.count({ where: filter }),
  ]);

  return paginatedResponse(data.map(mapOrder), total, page, limit);
}

async function getMyOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: parseId(orderId), userId: parseId(userId) },
    include: ORDER_INCLUDE,
  });
  if (!order) {
    throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  }
  return mapOrder(order);
}

async function cancelOrder(userId, orderId) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: parseId(orderId), userId: parseId(userId) },
      include: { items: true },
    });
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Idempotent: already cancelled is a success for the customer.
    if (order.status === 'cancelled') {
      return tx.order.findUnique({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    }

    if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
      throw ApiError.badRequest('Only pending, confirmed, or processing orders can be cancelled');
    }

    for (const item of order.items) {
      if (item.variantId) {
        await releaseStock(tx, item.variantId, item.quantity);
      }
    }

    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'cancelled' },
    });

    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: 'cancelled',
        note: 'Cancelled by customer',
        at: new Date(),
      },
    });

    return tx.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
  });

  return mapOrder(cancelled);
}

async function listOrders(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, '-createdAt');
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.userId) filter.userId = parseId(query.userId);

  if (query.q) {
    const q = String(query.q).trim();
    filter.OR = [
      { orderNumber: { contains: q } },
      { shipEmail: { contains: q } },
      { shipPhone: { contains: q } },
      { shipName: { contains: q } },
      { trackingNumber: { contains: q } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.lte = new Date(query.dateTo);
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: filter,
      include: ORDER_ADMIN_LIST_INCLUDE,
      orderBy: toOrderBy(sort, { createdAt: 'desc' }),
      skip,
      take: limit,
    }),
    prisma.order.count({ where: filter }),
  ]);

  return paginatedResponse(data.map(mapOrder), total, page, limit);
}

async function getOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: parseId(orderId) },
    include: ORDER_ADMIN_INCLUDE,
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  return mapOrder(order);
}

/** Lock the order row so two admins acting at once cannot restore stock twice. */
async function lockOrderRow(tx, orderId) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
}

async function updateStatus(orderId, { status, note }, adminId) {
  const byAdminId = parseId(adminId);
  const becomingCancelled = status === 'cancelled';
  const becomingRefunded = status === 'refunded';
  const shouldRestoreStock = becomingCancelled || becomingRefunded;

  const updated = await prisma.$transaction(async (tx) => {
    const id = parseId(orderId);
    if (!id) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
    await lockOrderRow(tx, id);

    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      throw ApiError.badRequest(
        `Cannot update a ${order.status} order`,
        null,
        'INVALID_STATUS_TRANSITION'
      );
    }

    if (!canTransitionOrderStatus(order.status, status)) {
      throw ApiError.badRequest(
        `Cannot move an order from ${order.status} to ${status}`,
        null,
        'INVALID_STATUS_TRANSITION'
      );
    }

    if (shouldRestoreStock) {
      for (const item of order.items) {
        if (item.variantId) {
          await releaseStock(tx, item.variantId, item.quantity);
        }
      }
      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status },
    });
    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status,
        note:
          note ||
          (becomingCancelled
            ? 'Cancelled by admin; stock restored'
            : becomingRefunded
              ? 'Refunded by admin; stock restored'
              : `Status updated to ${status}`),
        at: new Date(),
        byAdminId: byAdminId || null,
      },
    });
    return tx.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
  });

  return mapOrder(updated);
}

async function refundOrder(orderId, { note } = {}, adminId) {
  const byAdminId = parseId(adminId);

  const refunded = await prisma.$transaction(async (tx) => {
    const id = parseId(orderId);
    if (!id) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
    await lockOrderRow(tx, id);

    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
    }
    if (order.status === 'refunded') {
      throw ApiError.badRequest('Order is already refunded', null, 'INVALID_STATUS_TRANSITION');
    }
    if (!canTransitionOrderStatus(order.status, 'refunded')) {
      throw ApiError.badRequest(
        `Cannot refund an order that is ${order.status}`,
        null,
        'INVALID_STATUS_TRANSITION'
      );
    }

    for (const item of order.items) {
      if (item.variantId) {
        await releaseStock(tx, item.variantId, item.quantity);
      }
    }

    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'refunded' },
    });

    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: 'refunded',
        note: note || 'Order refunded; stock restored',
        at: new Date(),
        byAdminId: byAdminId || null,
      },
    });

    return tx.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
  });

  return mapOrder(refunded);
}

async function setTracking(orderId, trackingNumber, adminId) {
  const order = await prisma.order.findUnique({ where: { id: parseId(orderId) } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const byAdminId = parseId(adminId);
  const shouldShip =
    order.status === 'pending' ||
    order.status === 'confirmed' ||
    order.status === 'processing';

  const updated = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        trackingNumber,
        ...(shouldShip ? { status: 'shipped' } : {}),
      },
    });

    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: shouldShip ? 'shipped' : order.status,
        note: shouldShip
          ? `Tracking number set: ${trackingNumber}`
          : `Tracking number updated: ${trackingNumber}`,
        at: new Date(),
        byAdminId: byAdminId || null,
      },
    });

    return tx.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
  });

  return mapOrder(updated);
}

async function getPackingSlipPdf(orderId) {
  const order = await getOrder(orderId);
  const settings = await getSettings();
  const pdf = await generatePackingSlipPdf(order, settings);
  const ref = String(order.orderNumber || order.id || 'order').replace(/[^\w.-]+/g, '_');
  return {
    buffer: pdf,
    filename: `packing-receipt-${ref}.pdf`,
    contentType: 'application/pdf',
  };
}

module.exports = {
  previewCheckout,
  createOrder,
  listMyOrders,
  getMyOrder,
  cancelOrder,
  listOrders,
  getOrder,
  updateStatus,
  refundOrder,
  setTracking,
  getPackingSlipPdf,
  computeShipping,
  resolveTaxRate,
  checkoutTestHooks,
};
