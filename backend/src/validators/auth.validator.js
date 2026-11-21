const { z } = require('zod');

const registerSchema = z
  .object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(7).max(20).optional().nullable(),
  password: z.string().min(8).max(128),
  gender: z.enum(['women', 'men', 'unisex']).optional().nullable(),
  preferredSize: z.string().max(20).optional().nullable(),
  address: z
    .object({
      line1: z.string().min(2).max(200),
      line2: z.string().max(200).optional().nullable(),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      zip: z.string().min(2).max(20),
      country: z.string().min(2).max(100).default('US'),
    })
    .optional()
    .nullable(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Email or phone is required',
    path: ['email'],
  });

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const emailSchema = z.object({
  email: z.string().email(),
});

const loginSchema = z
  .object({
    email: z.string().email().optional().nullable(),
    phone: z.string().min(7).max(20).optional().nullable(),
    password: z.string().min(1),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Email or phone is required',
    path: ['email'],
  });

const googleSchema = z.object({
  accessToken: z.string().min(20),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

module.exports = {
  registerSchema,
  verifyEmailSchema,
  emailSchema,
  loginSchema,
  googleSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
