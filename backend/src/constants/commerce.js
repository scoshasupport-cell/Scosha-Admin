/** Shared commerce constants (backend). */
const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

/** Forward fulfillment only. Cancel before delivery. Refund only after the parcel has moved. */
const ORDER_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'processing', 'shipped', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
});

function canTransitionOrderStatus(from, to) {
  if (!from || !to || from === to) return false;
  const next = ORDER_TRANSITIONS[from];
  return Array.isArray(next) && next.includes(to);
}

const PRODUCT_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
});

const PAYMENT_METHOD = Object.freeze({
  COD: 'COD',
});

const DELIVERY_METHOD = Object.freeze({
  STANDARD: 'standard',
  EXPRESS: 'express',
});

const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  BANNED: 'banned',
  /** Anonymized by an admin; orders are kept for reporting, login is impossible. */
  DELETED: 'deleted',
});

const ROLE_SUPER_ADMIN = 'Super Admin';

const CATALOG = Object.freeze({
  /** Soft cap when materializing IDs for rare JSON-tag filters */
  MAX_TAG_SCAN: 2000,
  /** Soft cap for facet sampling (avoids loading entire catalog) */
  MAX_FACET_SAMPLE: 2000,
});

module.exports = {
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  canTransitionOrderStatus,
  PRODUCT_STATUS,
  PAYMENT_METHOD,
  DELIVERY_METHOD,
  USER_STATUS,
  ROLE_SUPER_ADMIN,
  CATALOG,
};
