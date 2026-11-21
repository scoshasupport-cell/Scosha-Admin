const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { parseId, mapProduct, mapVariant, toNumber } = require('../utils/prismaHelpers');
const money = require('../utils/money');
const {
  availabilityFromStock,
  isInStock,
  stockUnavailableError,
  syncCartItemsToStock,
} = require('./inventory.service');

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          basePrice: true,
          comparePrice: true,
          status: true,
          badge: true,
        },
      },
      variant: true,
    },
    orderBy: { createdAt: 'asc' },
  },
};

function sameId(a, b) {
  return Number(a) === Number(b);
}

function buildOwnerWhere({ userId, guestSessionId }) {
  const uid = parseId(userId);
  if (uid) return { userId: uid };
  if (guestSessionId && String(guestSessionId).trim()) {
    return { guestSessionId: String(guestSessionId).trim() };
  }
  throw ApiError.badRequest('User or guest session required');
}

async function findOrCreateCart({ userId, guestSessionId }, tx = prisma) {
  const where = buildOwnerWhere({ userId, guestSessionId });
  let cart = await tx.cart.findFirst({ where, include: CART_INCLUDE });
  if (cart) return cart;

  try {
    cart = await tx.cart.create({
      data: where,
      include: CART_INCLUDE,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      cart = await tx.cart.findFirst({ where, include: CART_INCLUDE });
      if (cart) return cart;
    }
    throw error;
  }
  return cart;
}

function populateCart(cart, meta = {}) {
  if (!cart) {
    return {
      items: [],
      itemCount: 0,
      subtotal: 0,
      stockAdjusted: false,
      stockMessages: [],
    };
  }

  let subtotalCents = 0;
  let itemCount = 0;

  const items = (cart.items || []).map((item) => {
    const variant = mapVariant(item.variant);
    const product = mapProduct(item.product);
    const availableStock = Math.max(0, Number(variant?.stock) || 0);
    const unitPrice = toNumber(variant?.price ?? product?.basePrice);
    const lineTotal = money.lineTotal(unitPrice, item.quantity);
    subtotalCents += money.toCents(lineTotal);
    itemCount += item.quantity;
    return {
      id: item.id,
      cartId: item.cartId,
      variantId: variant,
      productId: product,
      quantity: item.quantity,
      color: item.color || variant?.colorName,
      size: item.size || variant?.size,
      unitPrice,
      lineTotal,
      itemId: variant?.id || item.variantId,
      availableStock,
      maxQuantity: availableStock,
      inStock: isInStock(availableStock),
      availability: availabilityFromStock(availableStock),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  return {
    id: cart.id,
    userId: cart.userId,
    guestSessionId: cart.guestSessionId,
    items,
    itemCount,
    subtotal: money.fromCents(subtotalCents),
    stockAdjusted: Boolean(meta.adjusted),
    stockMessages: meta.messages || [],
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

async function loadFreshVariant(tx, variantId) {
  const pk = parseId(variantId);
  if (!pk) throw ApiError.notFound('Variant not found');

  const variant = await tx.productVariant.findUnique({ where: { id: pk } });
  if (!variant || variant.status !== 'active') {
    throw ApiError.notFound('Variant not found');
  }

  const product = await tx.product.findUnique({ where: { id: variant.productId } });
  if (!product || product.status !== 'active') {
    throw ApiError.notFound('Product not found');
  }

  return { variant, product };
}

function assertQtyAgainstStock(variant, quantity) {
  const qty = Number(quantity) || 0;
  if (qty < 1) throw ApiError.badRequest('Quantity must be at least 1');
  if (variant.stock < qty) {
    throw stockUnavailableError(variant.sku, variant.stock, qty);
  }
}

async function getCart(userId, guestSessionId) {
  const uid = parseId(userId);
  const guest = guestSessionId ? String(guestSessionId).trim() : null;
  const filter = uid ? { userId: uid } : guest ? { guestSessionId: guest } : null;
  if (!filter) {
    return { items: [], itemCount: 0, subtotal: 0, stockAdjusted: false, stockMessages: [] };
  }

  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({ where: filter, include: CART_INCLUDE });
    if (!cart) {
      return populateCart(null);
    }

    const sync = await syncCartItemsToStock(tx, cart.id);
    const refreshed = await tx.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
    return populateCart(refreshed, sync);
  });
}

async function addItem({ userId, guestSessionId }, { variantId, quantity }) {
  const qty = quantity || 1;
  if (qty < 1) throw ApiError.badRequest('Quantity must be at least 1');

  return prisma.$transaction(async (tx) => {
    const { variant } = await loadFreshVariant(tx, variantId);
    const cart = await findOrCreateCart({ userId, guestSessionId }, tx);

    // Lock cart row when possible (MySQL)
    await tx.$executeRaw`SELECT id FROM carts WHERE id = ${cart.id} FOR UPDATE`;

    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, variantId: variant.id },
    });

    const nextQty = existing ? existing.quantity + qty : qty;
    assertQtyAgainstStock(variant, nextQty);

    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variant.id,
          productId: variant.productId,
          quantity: qty,
          color: variant.colorName,
          size: variant.size,
        },
      });
    }

    const refreshed = await tx.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
    return populateCart(refreshed);
  });
}

async function updateItem({ userId, guestSessionId }, itemId, quantity) {
  if (quantity < 1) throw ApiError.badRequest('Quantity must be at least 1');

  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({
      where: buildOwnerWhere({ userId, guestSessionId }),
      include: { items: true },
    });
    if (!cart) throw ApiError.notFound('Cart not found');

    await tx.$executeRaw`SELECT id FROM carts WHERE id = ${cart.id} FOR UPDATE`;

    const item = cart.items.find((entry) => sameId(entry.variantId, itemId));
    if (!item) throw ApiError.notFound('Cart item not found');

    const { variant } = await loadFreshVariant(tx, item.variantId);
    assertQtyAgainstStock(variant, quantity);

    await tx.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    const refreshed = await tx.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
    return populateCart(refreshed);
  });
}

async function removeItem({ userId, guestSessionId }, itemId) {
  const cart = await prisma.cart.findFirst({
    where: buildOwnerWhere({ userId, guestSessionId }),
    include: CART_INCLUDE,
  });
  if (!cart) throw ApiError.notFound('Cart not found');

  const item = cart.items.find((entry) => sameId(entry.variantId, itemId));
  if (!item) throw ApiError.notFound('Cart item not found');

  await prisma.cartItem.delete({ where: { id: item.id } });

  const refreshed = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: CART_INCLUDE,
  });
  return populateCart(refreshed);
}

async function clearCart({ userId, guestSessionId }) {
  const cart = await prisma.cart.findFirst({
    where: buildOwnerWhere({ userId, guestSessionId }),
  });
  if (!cart) {
    return { items: [], itemCount: 0, subtotal: 0, stockAdjusted: false, stockMessages: [] };
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  const refreshed = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: CART_INCLUDE,
  });
  return populateCart(refreshed);
}

/**
 * Merge guest cart into the authenticated user's cart.
 * Prefer higher quantity when the same variant exists in both, then clamp to stock.
 */
async function mergeGuestCart(userId, guestSessionId) {
  const uid = parseId(userId);
  if (!uid) throw ApiError.unauthorized('Authentication required');
  if (!guestSessionId) {
    return getCart(uid, null);
  }

  return prisma.$transaction(async (tx) => {
    const [userCart, guestCart] = await Promise.all([
      tx.cart.findUnique({
        where: { userId: uid },
        include: { items: true },
      }),
      tx.cart.findUnique({
        where: { guestSessionId: String(guestSessionId) },
        include: { items: true },
      }),
    ]);

    if (!guestCart || guestCart.items.length === 0) {
      if (!userCart) return populateCart(null);
      const sync = await syncCartItemsToStock(tx, userCart.id);
      const full = await tx.cart.findUnique({
        where: { id: userCart.id },
        include: CART_INCLUDE,
      });
      return populateCart(full, sync);
    }

    let cart = userCart;
    if (!cart) {
      cart = await tx.cart.create({
        data: { userId: uid },
        include: { items: true },
      });
    }

    for (const guestItem of guestCart.items) {
      const existing = cart.items.find((item) => sameId(item.variantId, guestItem.variantId));
      if (existing) {
        const quantity = Math.max(existing.quantity, guestItem.quantity);
        await tx.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity,
            color: guestItem.color || existing.color,
            size: guestItem.size || existing.size,
          },
        });
        existing.quantity = quantity;
      } else {
        const created = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: guestItem.variantId,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
            color: guestItem.color,
            size: guestItem.size,
          },
        });
        cart.items.push(created);
      }
    }

    const sync = await syncCartItemsToStock(tx, cart.id);
    await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });

    const full = await tx.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
    return populateCart(full, sync);
  });
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCart,
};
