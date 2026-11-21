const { z } = require('zod');
const { objectId, idParams } = require('./brand.validator');

const addressBodySchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  line1: z.string().min(1).max(200),
  line2: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(20),
  country: z.string().min(2).max(100).default('US'),
  isDefault: z.boolean().optional(),
});

const createAddressSchema = addressBodySchema;

const updateAddressSchema = addressBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  idParams,
  objectId,
};
