const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { reportQuery } = require('../../validators/adminOps.validator');
const { z } = require('zod');

const router = express.Router();
router.use(authenticateAdmin);

const typeParams = z.object({
  type: z.enum([
    'sales',
    'revenue',
    'orders',
    'customers',
    'products',
    'inventory',
    'top-products',
    'top-by-category',
    'top-by-theme',
    'dsr',
    'weekly',
    'in-out',
    'costs',
    'margins',
    'pnl',
    'kpis',
    'upt',
    'average-basket',
    'leftovers',
  ]),
});

router.get(
  '/:type',
  requirePermission('reports', 'read'),
  validate(typeParams, 'params'),
  validate(reportQuery, 'query'),
  adminOpsController.exportReport
);

module.exports = router;
