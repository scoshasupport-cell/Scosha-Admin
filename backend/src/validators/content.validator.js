const { z } = require('zod');

const objectId = z.coerce.number().int().positive('Invalid id');
const idParams = z.object({ id: objectId });
const slugParams = z.object({ slug: z.string().min(1) });

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    q: z.string().optional(),
    status: z.string().optional(),
    position: z.string().optional(),
    category: z.string().optional(),
    tag: z.string().optional(),
  })
  .passthrough();

const homepageSectionTypes = [
  'hero',
  'announcement',
  'featuredCategories',
  'featuredProducts',
  'trending',
  'bestSellers',
  'newArrivals',
  'promoBanners',
  'newsletter',
  'footer',
  'navigation',
];

const createHomepageSectionSchema = z.object({
  type: z.enum(homepageSectionTypes),
  title: z.string().optional(),
  config: z.record(z.any()).optional(),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

const updateHomepageSectionSchema = createHomepageSectionSchema.partial();

const createBannerSchema = z.object({
  title: z.string().min(1),
  image: z.string().min(1),
  link: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  sortOrder: z.coerce.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

const updateBannerSchema = createBannerSchema.partial();

const seoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })
  .optional();

const createPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().optional(),
  seo: seoSchema,
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const updatePageSchema = createPageSchema.partial();

const createBlogSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  coverImage: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  publishedAt: z.coerce.date().optional().nullable(),
  seo: seoSchema,
});

const updateBlogSchema = createBlogSchema.partial();

const createFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional().nullable(),
  sortOrder: z.coerce.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const updateFaqSchema = createFaqSchema.partial();

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1),
});

const contactReplySchema = z.object({
  reply: z.string().min(1),
});

const newsletterSubscribeSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

const exportQuery = z
  .object({
    format: z.enum(['csv', 'xlsx', 'pdf']).optional(),
    status: z.enum(['subscribed', 'unsubscribed']).optional(),
  })
  .passthrough();

module.exports = {
  objectId,
  idParams,
  slugParams,
  paginationQuery,
  createHomepageSectionSchema,
  updateHomepageSectionSchema,
  createBannerSchema,
  updateBannerSchema,
  createPageSchema,
  updatePageSchema,
  createBlogSchema,
  updateBlogSchema,
  createFaqSchema,
  updateFaqSchema,
  contactSchema,
  contactReplySchema,
  newsletterSubscribeSchema,
  exportQuery,
};
