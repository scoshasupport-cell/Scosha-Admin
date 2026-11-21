const { z } = require('zod');
const { objectId, seoSchema, paginationQuery, idParams, slugParams } = require('./brand.validator');

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  details: z.array(z.string()).optional(),
  specs: z.record(z.string()).optional(),
  brandId: objectId,
  categoryId: objectId,
  subCategoryId: objectId.optional().nullable(),
  collectionIds: z.array(objectId).optional(),
  basePrice: z.coerce.number().min(0),
  comparePrice: z.coerce.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  vipEarlyAccess: z.boolean().optional(),
  relatedProductIds: z.array(objectId).optional(),
  seo: seoSchema,
  weight: z.coerce.number().optional(),
  badge: z.string().optional().nullable(),
});

const updateProductSchema = createProductSchema.partial();

const flagsSchema = z.object({
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  vipEarlyAccess: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one flag is required',
});

const relatedSchema = z.object({
  relatedProductIds: z.array(objectId),
});

const seoUpdateSchema = z.object({
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

const productQuery = paginationQuery.extend({
  brand: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  subCategory: z.string().optional(),
  collection: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  rating: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  availability: z.enum(['in_stock', 'out_of_stock']).optional(),
  inStock: z.string().optional(),
  featured: z.string().optional(),
  trending: z.string().optional(),
  newArrival: z.string().optional(),
  bestSeller: z.string().optional(),
  tag: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
}).passthrough();

const relatedParams = z.object({ id: objectId });
const relatedQuery = z.object({
  limit: z.coerce.number().int().positive().max(48).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  flagsSchema,
  relatedSchema,
  seoUpdateSchema,
  productQuery,
  relatedParams,
  relatedQuery,
  idParams,
  slugParams,
};
