const { z } = require('zod');

const shippingSchema = z
  .object({
    standardCharge: z.coerce.number().min(0).optional(),
    expressCharge: z.coerce.number().min(0).optional(),
    freeShippingThreshold: z.coerce.number().min(0).optional(),
    standardEta: z.string().optional(),
    expressEta: z.string().optional(),
  })
  .optional();

const updateSettingsSchema = z
  .object({
    storeName: z.string().min(1).optional(),
    logo: z.string().optional().nullable(),
    favicon: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    currency: z.string().min(1).optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),
    socialLinks: z
      .object({
        facebook: z.string().optional().nullable(),
        instagram: z.string().optional().nullable(),
        twitter: z.string().optional().nullable(),
        youtube: z.string().optional().nullable(),
        tiktok: z.string().optional().nullable(),
      })
      .optional(),
    shipping: shippingSchema,
    taxes: z
      .object({
        rate: z.coerce.number().min(0).optional(),
        included: z.boolean().optional(),
      })
      .optional(),
    paymentMethods: z
      .array(
        z.object({
          key: z.string().min(1),
          label: z.string().min(1),
          enabled: z.boolean().optional(),
        })
      )
      .optional(),
    adminEmail: z.string().email().optional().or(z.literal('')),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
  })
  .passthrough();

module.exports = { updateSettingsSchema };
