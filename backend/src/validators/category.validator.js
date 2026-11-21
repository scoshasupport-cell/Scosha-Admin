const { z } = require('zod');
const { objectId, seoSchema, paginationQuery, statusSchema, idParams, slugParams } = require('./brand.validator');

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  parentId: objectId.nullable().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  seo: seoSchema,
  status: z.enum(['active', 'inactive']).optional(),
  sortOrder: z.coerce.number().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: objectId,
      sortOrder: z.coerce.number(),
    })
  ),
});

const categoryQuery = paginationQuery.extend({
  parentId: z.string().optional(),
  root: z.string().optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  reorderSchema,
  categoryQuery,
  statusSchema,
  idParams,
  slugParams,
};
