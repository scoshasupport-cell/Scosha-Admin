const { z } = require('zod');

const objectId = z.coerce.number().int().positive('Invalid id');
const idParams = z.object({ id: objectId });

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    q: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

const revenueChartQuery = z
  .object({
    period: z.enum(['7d', '30d', '90d', '12m']).optional().default('30d'),
  })
  .passthrough();

const reportQuery = z
  .object({
    format: z.enum(['csv', 'xlsx', 'pdf']).optional().default('csv'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    dailyTarget: z.coerce.number().nonnegative().optional(),
    srTarget: z.coerce.number().nonnegative().max(100).optional(),
  })
  .passthrough();

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(objectId).optional(),
});

const updateRoleSchema = createRoleSchema.partial();

const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: objectId,
  status: z.enum(['active', 'banned']).optional(),
  avatar: z.string().optional().nullable(),
});

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  roleId: objectId.optional(),
  status: z.enum(['active', 'banned']).optional(),
  avatar: z.string().optional().nullable(),
});

module.exports = {
  objectId,
  idParams,
  paginationQuery,
  revenueChartQuery,
  reportQuery,
  createRoleSchema,
  updateRoleSchema,
  createAdminSchema,
  updateAdminSchema,
};
