const { z } = require('zod');

const objectId = z.coerce.number().int().positive('Invalid id');

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    productId: objectId.optional(),
    q: z.string().optional(),
  })
  .passthrough();

const productIdParams = z.object({ productId: objectId });
const idParams = z.object({ id: objectId });

const createReviewSchema = z.object({
  productId: objectId,
  orderId: objectId.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  text: z.string().max(5000).optional(),
  images: z.array(z.string().url().or(z.string().min(1))).optional(),
});

const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  text: z.string().max(5000).optional(),
  images: z.array(z.string()).optional(),
});

const replySchema = z.object({
  text: z.string().min(1).max(5000),
});

module.exports = {
  objectId,
  paginationQuery,
  productIdParams,
  idParams,
  createReviewSchema,
  updateReviewSchema,
  replySchema,
};
