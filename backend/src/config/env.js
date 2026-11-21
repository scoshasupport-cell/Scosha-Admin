const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  MONGODB_URI: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  COOKIE_SECRET: z.string().min(8).default('dev-cookie-secret-change-me'),
  GUEST_SESSION_COOKIE: z.string().default('guestSessionId'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_FOLDER: z.string().default('scosha'),

  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  // Prefer a verified domain address with Resend (not @gmail.com) in production.
  SMTP_FROM: z.string().default('SCOSHA <noreply@scosha.com>'),
  SMTP_REPLY_TO: z.string().optional().default(''),
  // When set, outbound mail uses Resend SMTP automatically (recommended vs Gmail).
  RESEND_API_KEY: z.string().optional().default(''),
  ADMIN_EMAIL: z.string().email().default('admin@scosha.com'),
  EMAIL_ENABLED: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return true;
      if (typeof v === 'boolean') return v;
      return !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase());
    }),
  SMTP_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),

  STOREFRONT_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3000/admin'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:5174'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  FREE_SHIPPING_THRESHOLD: z.coerce.number().nonnegative().default(150),
  DEFAULT_SHIPPING_CHARGE: z.coerce.number().nonnegative().default(9),
  TAX_RATE: z.coerce.number().nonnegative().default(0),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional(),

  /** Perfect Corp / YouCam YCE API (https://yce.perfectcorp.com/ai-api) */
  PERFECT_CORP_API_KEY: z.string().optional().default(''),
  PERFECT_CORP_API_BASE: z
    .string()
    .url()
    .optional()
    .default('https://yce-api-01.makeupar.com'),

  /** Web OAuth client id for Continue with Google. Same value as NEXT_PUBLIC_GOOGLE_CLIENT_ID. */
  GOOGLE_CLIENT_ID: z.string().optional().default(''),

  /** Google Gemini (universal image understanding + specialized analysis + rerank) */
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-flash-latest'),
  /** Comma-separated models tried in order when the primary returns 429/5xx/404. */
  GEMINI_FALLBACK_MODELS: z
    .string()
    .optional()
    .default('gemini-3.8-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest'),
  /** Include the internal decision trace in API responses (never enable in production). */
  AI_DEBUG_RESPONSE: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (typeof v === 'boolean') return v;
      return ['1', 'true', 'yes', 'on'].includes(String(v || '').toLowerCase());
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

const env = {
  ...data,
  isDev: data.NODE_ENV === 'development',
  isProd: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

module.exports = { env };
