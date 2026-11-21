const { z } = require('zod');

const objectId = z.coerce.number().int().positive('Invalid id');

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    q: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .passthrough();

const validateCouponSchema = z.object({
  code: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  subtotal: z.coerce.number().min(0),
});

const createCouponSchema = z.object({
  code: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0),
  minOrder: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().min(0).optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).optional().nullable(),
  perUserLimit: z.coerce.number().int().min(0).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  applicableProductIds: z.array(objectId).optional(),
  applicableCategoryIds: z.array(objectId).optional(),
});

const updateCouponSchema = createCouponSchema.partial();
const idParams = z.object({ id: objectId });

module.exports = {
  objectId,
  paginationQuery,
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema,
  idParams,
};
