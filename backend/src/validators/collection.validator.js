const { z } = require('zod');
const { objectId, seoSchema, paginationQuery, statusSchema, idParams, slugParams } = require('./brand.validator');

const createCollectionSchema = z.object({
  name: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  productIds: z.array(objectId).optional(),
  featured: z.boolean().optional(),
  seasonal: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  accessLevel: z.enum(['draft', 'vip_early_access', 'public']).optional(),
  publicAt: z.union([z.string().datetime().optional(), z.string().optional(), z.null()]).optional(),
  sortOrder: z.coerce.number().optional(),
  seo: seoSchema,
});

const updateCollectionSchema = createCollectionSchema.partial();

const featuredSchema = z.object({
  featured: z.boolean(),
});

const collectionQuery = paginationQuery.extend({
  featured: z.string().optional(),
  seasonal: z.string().optional(),
  accessLevel: z.string().optional(),
});

module.exports = {
  createCollectionSchema,
  updateCollectionSchema,
  featuredSchema,
  collectionQuery,
  statusSchema,
  idParams,
  slugParams,
};
