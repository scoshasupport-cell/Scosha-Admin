/**
 * Shared Prisma helpers for Int IDs, Mongo-style sort maps, and Decimal coercion.
 */

function parseId(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function requireId(value, label = 'id') {
  const id = parseId(value);
  if (!id) {
    const { ApiError } = require('./ApiError');
    throw ApiError.badRequest(`Invalid ${label}`);
  }
  return id;
}

/** Convert { field: 1|-1 } or { field: 'asc'|'desc' } to Prisma orderBy. */
function toOrderBy(sortObj = {}, fallback = { createdAt: 'desc' }) {
  const entries = Object.entries(sortObj || {}).filter(([key]) => key && key !== 'score');
  if (!entries.length) {
    return Array.isArray(fallback) ? fallback : [fallback];
  }
  return entries.map(([key, dir]) => ({
    [key]: dir === -1 || dir === 'desc' || dir === 'DESC' ? 'desc' : 'asc',
  }));
}

function toNumber(value, fallback = 0) {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapDecimals(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const field of fields) {
    if (out[field] !== undefined && out[field] !== null) {
      out[field] = Number(out[field]);
    }
  }
  return out;
}

const PRODUCT_DECIMAL_FIELDS = [
  'basePrice',
  'comparePrice',
  'weight',
  'ratingAvg',
];

const VARIANT_DECIMAL_FIELDS = ['price', 'comparePrice', 'weight'];

const ORDER_DECIMAL_FIELDS = [
  'shippingCharge',
  'tax',
  'couponDiscount',
  'subtotal',
  'total',
];

const ORDER_ITEM_DECIMAL_FIELDS = ['unitPrice', 'comparePrice', 'weight'];

function mapVariant(variant) {
  if (!variant) return variant;
  const mapped = mapDecimals({ ...variant }, VARIANT_DECIMAL_FIELDS);
  mapped.color = {
    name: variant.colorName || variant.color?.name || '',
    hex: variant.colorHex || variant.color?.hex || null,
  };
  return mapped;
}

function toScoCatalogSlug(slug) {
  return String(slug || '').replace(/-(ama|pup)-/gi, '-sco-');
}

function mapProduct(product) {
  if (!product) return product;
  const mapped = mapDecimals({ ...product }, PRODUCT_DECIMAL_FIELDS);
  if (mapped.slug) mapped.slug = toScoCatalogSlug(mapped.slug);
  if (mapped.specs && typeof mapped.specs === 'object' && !Array.isArray(mapped.specs) && mapped.specs.SKU) {
    mapped.specs = {
      ...mapped.specs,
      SKU: String(mapped.specs.SKU).replace(/^(PUP|AMA)-/i, 'SCO-'),
    };
  }

  if (mapped.brand && typeof mapped.brand === 'object') {
    // keep nested brand; also expose brandId as relation snapshot when included
  }
  if (Array.isArray(mapped.variants)) {
    mapped.variants = mapped.variants.map(mapVariant);
  }
  if (Array.isArray(mapped.collections)) {
    mapped.collectionIds = mapped.collections
      .map((pc) => pc.collection || pc.collectionId)
      .filter(Boolean);
  }
  if (mapped.ratingAvg != null) mapped.ratingAvg = Number(mapped.ratingAvg);
  return mapped;
}

function shippingAddressFromOrder(order) {
  if (!order) return null;
  return {
    name: order.shipName,
    phone: order.shipPhone,
    email: order.shipEmail,
    line1: order.shipLine1,
    line2: order.shipLine2,
    city: order.shipCity,
    state: order.shipState,
    zip: order.shipZip,
    country: order.shipCountry,
  };
}

function withLegacyId(entity) {
  if (!entity || typeof entity !== 'object') return entity;
  if (entity.id != null && entity._id == null) {
    return { ...entity, _id: entity.id };
  }
  return entity;
}

function mapOrder(order) {
  if (!order) return order;
  const mapped = mapDecimals({ ...order }, ORDER_DECIMAL_FIELDS);
  if (Array.isArray(mapped.items)) {
    mapped.items = mapped.items.map((item) => {
      // unitCost is margin data for admin reports only; never serialize it on order payloads.
      const { unitCost, ...publicItem } = item;
      const row = mapDecimals({ ...publicItem }, ORDER_ITEM_DECIMAL_FIELDS);
      const unitPrice = toNumber(row.unitPrice ?? row.price);
      const quantity = Number(row.quantity) || 0;
      return {
        ...row,
        price: unitPrice,
        unitPrice,
        image: row.image || row.imageUrl || '',
        imageUrl: row.imageUrl || row.image || '',
        lineTotal: toNumber(row.lineTotal, unitPrice * quantity),
      };
    });
  }
  mapped.shippingAddress = shippingAddressFromOrder(order);
  if (mapped.user && !mapped.userId?.name) {
    // when user relation included, expose as nested userId for admin list compat
    mapped.userId = {
      id: mapped.user.id,
      _id: mapped.user.id,
      name: mapped.user.name,
      email: mapped.user.email,
      phone: mapped.user.phone,
    };
  }
  return withLegacyId(mapped);
}

function containsInsensitive(field, value) {
  return { [field]: { contains: String(value) } };
}

module.exports = {
  parseId,
  requireId,
  toOrderBy,
  toNumber,
  mapDecimals,
  mapVariant,
  mapProduct,
  mapOrder,
  withLegacyId,
  shippingAddressFromOrder,
  containsInsensitive,
  PRODUCT_DECIMAL_FIELDS,
  VARIANT_DECIMAL_FIELDS,
  ORDER_DECIMAL_FIELDS,
  ORDER_ITEM_DECIMAL_FIELDS,
};
