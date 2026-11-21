const productRepository = require('../repositories/product.repository');
const variantRepository = require('../repositories/variant.repository');
const { ApiError } = require('../utils/ApiError');
const { slugify } = require('../utils/slugify');
const { getPagination, paginatedResponse, getSort } = require('../utils/pagination');
const { parseId, toNumber } = require('../utils/prismaHelpers');
const { logStockMovement } = require('./inventory.service');
const { prisma } = require('../config/prisma');

function buildSku({ productSlug, colorName, size, explicitSku }) {
  if (explicitSku) return String(explicitSku).trim().toUpperCase();
  const colorPart = slugify(colorName || 'default').toUpperCase().replace(/-/g, '');
  const sizePart = String(size || 'OS')
    .toUpperCase()
    .replace(/\s+/g, '');
  const base = slugify(productSlug || 'product').toUpperCase().replace(/-/g, '');
  return `${base}-${colorPart}-${sizePart}`;
}

function normalizeVariantPayload(payload = {}) {
  const data = { ...payload };
  if (payload.color && typeof payload.color === 'object') {
    if (payload.color.name !== undefined) data.colorName = payload.color.name;
    if (payload.color.hex !== undefined) data.colorHex = payload.color.hex;
  }
  delete data.color;
  delete data.id;
  delete data._id;
  if (data.price !== undefined) data.price = toNumber(data.price);
  if (data.comparePrice !== undefined) {
    data.comparePrice = data.comparePrice == null ? null : toNumber(data.comparePrice);
  }
  if (data.costPrice !== undefined) {
    data.costPrice = data.costPrice == null ? null : toNumber(data.costPrice);
  }
  if (data.weight !== undefined) {
    data.weight = data.weight == null ? null : toNumber(data.weight);
  }
  if (data.stock !== undefined) data.stock = Number(data.stock) || 0;
  return data;
}

async function ensureUniqueSku(sku, excludeId = null) {
  let candidate = sku;
  let n = 0;
  const exclude = parseId(excludeId);
  while (true) {
    const existing = await variantRepository.findBySku(candidate);
    if (!existing || (exclude && existing.id === exclude)) {
      return candidate;
    }
    n += 1;
    candidate = `${sku}-${n}`;
  }
}

async function assertProduct(productId) {
  const product = await productRepository.findById(productId, { populate: false });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function listByProduct(productId, query = {}) {
  await assertProduct(productId);
  const { page, limit, skip } = getPagination(query);
  const filter = { productId: parseId(productId) };
  if (query.status) filter.status = query.status;
  if (query.color) filter.colorName = { equals: String(query.color) };
  if (query.size) filter.size = { equals: String(query.size) };

  const [data, total] = await Promise.all([
    variantRepository.find(filter, {
      sort: getSort(query, 'colorName'),
      skip,
      limit,
    }),
    variantRepository.count(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

async function getById(variantId) {
  const variant = await variantRepository.findById(variantId);
  if (!variant) throw ApiError.notFound('Variant not found');
  return variant;
}

async function create(productId, payload) {
  const product = await assertProduct(productId);
  const normalized = normalizeVariantPayload(payload);

  const sku = await ensureUniqueSku(
    buildSku({
      productSlug: product.slug,
      colorName: normalized.colorName,
      size: normalized.size,
      explicitSku: payload.sku,
    })
  );

  return variantRepository.create({
    productId: parseId(productId),
    colorName: normalized.colorName || 'Default',
    colorHex: normalized.colorHex || null,
    size: normalized.size || 'OS',
    sku,
    price: normalized.price ?? toNumber(product.basePrice),
    comparePrice:
      normalized.comparePrice ??
      (product.comparePrice != null ? toNumber(product.comparePrice) : null),
    stock: normalized.stock ?? 0,
    weight: normalized.weight ?? toNumber(product.weight, 0),
    images: normalized.images || [],
    status: normalized.status || 'active',
  });
}

async function update(productId, variantId, payload) {
  await assertProduct(productId);
  const variant = await variantRepository.findById(variantId);
  if (!variant || variant.productId !== parseId(productId)) {
    throw ApiError.notFound('Variant not found for this product');
  }

  const data = normalizeVariantPayload(payload);
  if (data.stock !== undefined) {
    data.stock = Math.max(0, Math.floor(Number(data.stock) || 0));
  }
  if (payload.sku || payload.color || payload.size || payload.colorName) {
    const product = await productRepository.findById(productId, { populate: false });
    const skuBase = buildSku({
      productSlug: product.slug,
      colorName: data.colorName || variant.colorName,
      size: data.size || variant.size,
      explicitSku: payload.sku,
    });
    data.sku = await ensureUniqueSku(skuBase, variantId);
  }

  return variantRepository.updateById(variantId, data);
}

/** Admin restock / set absolute stock on a variant (by variant id alone). */
async function setStock(variantId, stock, { adminId, note } = {}) {
  const id = parseId(variantId);
  if (!id) throw ApiError.notFound('Variant not found');
  const variant = await variantRepository.findById(id);
  if (!variant) throw ApiError.notFound('Variant not found');

  const before = Number(variant.stock) || 0;
  const next = Math.max(0, Math.floor(Number(stock) || 0));
  const updated = await variantRepository.updateById(id, { stock: next });
  if (next !== before) {
    await logStockMovement(prisma, {
      variantId: id,
      quantity: next - before,
      reason: 'set',
      note,
      adminId,
      stockBefore: before,
      stockAfter: next,
    });
  }
  return updated;
}

async function adjustStock(variantId, delta, { adminId, note } = {}) {
  const id = parseId(variantId);
  if (!id) throw ApiError.notFound('Variant not found');
  const variant = await variantRepository.findById(id);
  if (!variant) throw ApiError.notFound('Variant not found');

  const before = Number(variant.stock) || 0;
  const next = Math.max(0, Math.floor(before + Number(delta || 0)));
  const updated = await variantRepository.updateById(id, { stock: next });
  if (next !== before) {
    await logStockMovement(prisma, {
      variantId: id,
      quantity: next - before,
      reason: Number(delta) > 0 ? 'restock' : 'adjust',
      note,
      adminId,
      stockBefore: before,
      stockAfter: next,
    });
  }
  return updated;
}

async function remove(productId, variantId) {
  await assertProduct(productId);
  const variant = await variantRepository.findById(variantId);
  if (!variant || variant.productId !== parseId(productId)) {
    throw ApiError.notFound('Variant not found for this product');
  }
  return variantRepository.updateById(variantId, { status: 'inactive' });
}

async function hardDelete(productId, variantId) {
  await assertProduct(productId);
  const variant = await variantRepository.findById(variantId);
  if (!variant || variant.productId !== parseId(productId)) {
    throw ApiError.notFound('Variant not found for this product');
  }
  await variantRepository.deleteById(variantId);
  return { deleted: true, id: parseId(variantId) };
}

async function listLowStock(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const threshold = Number(query.threshold) || 10;
  const availability = String(query.availability || 'low').toLowerCase();

  const filter = { status: 'active' };
  if (availability === 'out_of_stock' || availability === 'out') {
    filter.stock = 0;
  } else if (availability === 'in_stock' || availability === 'in') {
    filter.stock = { gt: 0 };
  } else if (availability === 'all') {
    // no stock filter
  } else {
    filter.stock = { lte: threshold };
  }

  const [data, total] = await Promise.all([
    variantRepository.find(filter, {
      skip,
      limit,
      sort: { stock: 1 },
      populate: true,
    }),
    variantRepository.count(filter),
  ]);
  return paginatedResponse(data, total, page, limit);
}

module.exports = {
  listByProduct,
  getById,
  create,
  update,
  remove,
  hardDelete,
  listLowStock,
  setStock,
  adjustStock,
  buildSku,
  ensureUniqueSku,
};
