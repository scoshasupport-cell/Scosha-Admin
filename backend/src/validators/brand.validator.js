const { z } = require('zod');

const objectId = z.coerce.number().int().positive('Invalid id');

const seoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })
  .optional();

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).passthrough();

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
  description: z.string().optional(),
  seo: seoSchema,
  status: z.enum(['active', 'inactive']).optional(),
  sortOrder: z.coerce.number().optional(),
});

const updateBrandSchema = createBrandSchema.partial();

const statusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

const idParams = z.object({ id: objectId });
const slugParams = z.object({ slug: z.string().min(1) });

module.exports = {
  objectId,
  seoSchema,
  paginationQuery,
  createBrandSchema,
  updateBrandSchema,
  statusSchema,
  idParams,
  slugParams,
};
