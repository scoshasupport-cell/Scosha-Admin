const { z } = require('zod');
const { objectId } = require('./brand.validator');

const addCartItemSchema = z.object({
  variantId: objectId,
  quantity: z.coerce.number().int().min(1).default(1),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1),
});

const cartItemParams = z.object({
  itemId: objectId, // variantId (cart items have no subdocument _id)
});

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParams,
};
