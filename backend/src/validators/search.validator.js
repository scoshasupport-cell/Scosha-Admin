const { z } = require('zod');
const { paginationQuery } = require('./brand.validator');

const searchQuery = paginationQuery.extend({
  q: z.string().optional(),
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
  sort: z.string().optional(),
}).passthrough();

const suggestionsQuery = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

module.exports = {
  searchQuery,
  suggestionsQuery,
};
