const { z } = require('zod');
const { objectId, paginationQuery, idParams } = require('./brand.validator');

const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().optional(),
});

const createVariantSchema = z.object({
  color: colorSchema,
  size: z.string().min(1),
  sku: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  comparePrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).optional(),
  weight: z.coerce.number().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const updateVariantSchema = createVariantSchema.partial();

const productIdParams = z.object({ id: objectId });
const variantParams = z.object({
  id: objectId,
  variantId: objectId,
});

const inventoryQuery = paginationQuery.extend({
  threshold: z.coerce.number().int().min(0).optional(),
  availability: z
    .enum(['low', 'all', 'in_stock', 'out_of_stock', 'in', 'out'])
    .optional(),
});

const setStockSchema = z.object({
  stock: z.coerce.number().int().min(0),
});

const adjustStockSchema = z.object({
  delta: z.coerce.number().int(),
});

module.exports = {
  createVariantSchema,
  updateVariantSchema,
  productIdParams,
  variantParams,
  inventoryQuery,
  setStockSchema,
  adjustStockSchema,
  idParams,
};
