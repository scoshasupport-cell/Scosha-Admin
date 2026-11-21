/**
 * Shared inventory helpers — ProductVariant.stock is the source of truth.
 * Availability is always derived: stock > 0 → IN_STOCK, else OUT_OF_STOCK.
 */
const { ApiError } = require('../utils/ApiError');
const { parseId } = require('../utils/prismaHelpers');

const AVAILABILITY = Object.freeze({
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
});

function availabilityFromStock(stock) {
  return Number(stock) > 0 ? AVAILABILITY.IN_STOCK : AVAILABILITY.OUT_OF_STOCK;
}

function isInStock(stock) {
  return Number(stock) > 0;
}

function stockUnavailableError(sku, available = 0, requested) {
  const name = sku ? ` (${sku})` : '';
  if (available <= 0) {
    return ApiError.badRequest(
      `Sorry, this product is no longer available${name}.`,
      { available: 0, requested, code: 'OUT_OF_STOCK' }
    );
  }
  return ApiError.badRequest(
    `Only ${available} left in stock${name}. Please reduce your quantity.`,
    { available, requested, code: 'INSUFFICIENT_STOCK' }
  );
}

async function logStockMovement(tx, {
  variantId,
  quantity,
  reason,
  note,
  orderId,
  adminId,
  stockBefore,
  stockAfter,
}) {
  const client = tx || require('../config/prisma').prisma;
  await client.stockMovement.create({
    data: {
      variantId: parseId(variantId),
      quantity: Number(quantity) || 0,
      reason: String(reason || 'adjust').slice(0, 64),
      note: note ? String(note).slice(0, 500) : null,
      orderId: orderId != null ? parseId(orderId) : null,
      adminId: adminId != null ? parseId(adminId) : null,
      stockBefore: Math.max(0, Number(stockBefore) || 0),
      stockAfter: Math.max(0, Number(stockAfter) || 0),
    },
  });
}

/**
 * Atomically decrement stock if enough units remain.
 * Must be called inside a Prisma transaction when part of checkout.
 */
async function claimStock(tx, variantId, quantity, { sku, orderId } = {}) {
  const qty = Math.max(0, Number(quantity) || 0);
  const id = parseId(variantId);
  if (!id || qty < 1) {
    throw ApiError.badRequest('Invalid stock claim');
  }

  // Locking read: under REPEATABLE READ a plain SELECT would return the snapshot taken at
  // the start of the transaction, so a customer who lost the race would be told the stale
  // "available" number. FOR UPDATE blocks until the competing checkout commits and then
  // returns the committed stock, which also makes the movement log exact.
  const rows = await tx.$queryRaw`
    SELECT stock, sku FROM product_variants WHERE id = ${id} FOR UPDATE
  `;
  const current = Array.isArray(rows) ? rows[0] : null;
  const before = Number(current?.stock) || 0;

  if (!current || before < qty) {
    throw stockUnavailableError(sku || current?.sku, before, qty);
  }

  const updated = await tx.productVariant.updateMany({
    where: { id, stock: { gte: qty } },
    data: { stock: { decrement: qty } },
  });

  if (updated.count === 0) {
    throw stockUnavailableError(sku || current?.sku, before, qty);
  }

  await logStockMovement(tx, {
    variantId: id,
    quantity: -qty,
    reason: 'sale',
    orderId,
    stockBefore: before,
    stockAfter: before - qty,
  });

  return updated;
}

/**
 * Restore stock after cancel/refund. Never used for oversell repair.
 */
async function releaseStock(tx, variantId, quantity, { orderId, reason = 'return' } = {}) {
  const qty = Math.max(0, Number(quantity) || 0);
  const id = parseId(variantId);
  if (!id || qty < 1) return;

  const current = await tx.productVariant.findUnique({
    where: { id },
    select: { stock: true },
  });
  const before = Number(current?.stock) || 0;

  await tx.productVariant.update({
    where: { id },
    data: { stock: { increment: qty } },
  });

  await logStockMovement(tx, {
    variantId: id,
    quantity: qty,
    reason,
    orderId,
    stockBefore: before,
    stockAfter: before + qty,
  });
}

/**
 * Clamp / remove cart lines so quantities never exceed live stock.
 * Returns { adjusted: boolean, messages: string[] }.
 */
async function syncCartItemsToStock(tx, cartId) {
  const items = await tx.cartItem.findMany({ where: { cartId: parseId(cartId) } });
  if (!items.length) return { adjusted: false, messages: [], removed: 0, clamped: 0 };

  const variantIds = items.map((i) => i.variantId);
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, stock: true, status: true, sku: true },
  });
  const map = new Map(variants.map((v) => [v.id, v]));

  let adjusted = false;
  let removed = 0;
  let clamped = 0;
  const messages = [];

  for (const item of items) {
    const variant = map.get(item.variantId);
    if (!variant || variant.status !== 'active' || variant.stock <= 0) {
      await tx.cartItem.delete({ where: { id: item.id } });
      adjusted = true;
      removed += 1;
      messages.push(
        `${variant?.sku || 'An item'} is out of stock and was removed from your bag.`
      );
      continue;
    }
    if (item.quantity > variant.stock) {
      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: variant.stock },
      });
      adjusted = true;
      clamped += 1;
      messages.push(
        `${variant.sku}: quantity reduced to ${variant.stock} (only ${variant.stock} left).`
      );
    }
  }

  return { adjusted, messages, removed, clamped };
}

module.exports = {
  AVAILABILITY,
  availabilityFromStock,
  isInStock,
  stockUnavailableError,
  logStockMovement,
  claimStock,
  releaseStock,
  syncCartItemsToStock,
};
