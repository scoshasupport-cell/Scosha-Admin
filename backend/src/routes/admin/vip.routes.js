const express = require('express');
const vipController = require('../../controllers/vip.controller');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { paginationQuery, idParams } = require('../../validators/adminOps.validator');
const { z } = require('zod');

const router = express.Router();
router.use(authenticateAdmin);

const updateVipBody = z.object({
  isVip: z.boolean().optional(),
  vipPendingDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  freeDeliveryCredits: z.coerce.number().min(0).max(500).optional(),
  vipEarlyAccess: z.boolean().optional(),
  resetCongrats: z.boolean().optional(),
});

const broadcastBody = z.object({
  productId: z.union([z.string(), z.number()]).optional(),
  collectionId: z.union([z.string(), z.number()]).optional(),
});

router.get(
  '/customers',
  requirePermission('customers', 'read'),
  validate(paginationQuery, 'query'),
  adminOpsController.listVipCustomers
);
router.patch(
  '/customers/:id',
  requirePermission('customers', 'update'),
  validate(idParams, 'params'),
  validate(updateVipBody),
  vipController.adminUpdate
);
router.post(
  '/broadcast',
  requirePermission('customers', 'update'),
  validate(broadcastBody),
  vipController.adminBroadcast
);

module.exports = router;
