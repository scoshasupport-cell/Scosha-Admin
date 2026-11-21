const { z } = require('zod');
const { objectId, idParams } = require('./brand.validator');

const deliveryMethod = z.enum(['standard', 'express']);

const orderStatus = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

const checkoutBody = z.object({
  addressId: objectId,
  deliveryMethod: deliveryMethod.default('standard'),
  couponCode: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const previewBody = checkoutBody.omit({ notes: true });

const createOrderBody = checkoutBody;

const updateStatusBody = z.object({
  status: orderStatus,
  note: z.string().trim().max(500).optional(),
});

const refundBody = z.object({
  note: z.string().trim().max(500).optional(),
});

const trackingBody = z.object({
  trackingNumber: z.string().trim().min(1).max(120),
});

const listOrdersQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    status: orderStatus.optional(),
    q: z.string().optional(),
    userId: objectId.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .passthrough();

const myOrdersQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    status: orderStatus.optional(),
  })
  .passthrough();

module.exports = {
  objectId,
  idParams,
  deliveryMethod,
  orderStatus,
  previewBody,
  createOrderBody,
  updateStatusBody,
  refundBody,
  trackingBody,
  listOrdersQuery,
  myOrdersQuery,
};
