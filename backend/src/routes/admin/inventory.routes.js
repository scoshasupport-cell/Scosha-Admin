const express = require('express');
const variantController = require('../../controllers/variant.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  inventoryQuery,
  setStockSchema,
  adjustStockSchema,
} = require('../../validators/variant.validator');
const { z } = require('zod');
const { objectId } = require('../../validators/brand.validator');

const router = express.Router();
const variantIdParams = z.object({ variantId: objectId });

router.use(authenticateAdmin);

router.get(
  '/',
  requirePermission('inventory', 'read'),
  validate(inventoryQuery, 'query'),
  variantController.listLowStock
);

router.patch(
  '/:variantId/stock',
  requirePermission('inventory', 'update'),
  validate(variantIdParams, 'params'),
  validate(setStockSchema),
  variantController.setStock
);

router.post(
  '/:variantId/adjust',
  requirePermission('inventory', 'update'),
  validate(variantIdParams, 'params'),
  validate(adjustStockSchema),
  variantController.adjustStock
);

module.exports = router;
