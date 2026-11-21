const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { revenueChartQuery } = require('../../validators/adminOps.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/stats', requirePermission('reports', 'read'), adminOpsController.getStats);
router.get(
  '/charts/revenue',
  requirePermission('reports', 'read'),
  validate(revenueChartQuery, 'query'),
  adminOpsController.revenueChart
);
router.get('/charts/orders', requirePermission('reports', 'read'), adminOpsController.ordersChart);
router.get('/latest-orders', requirePermission('orders', 'read'), adminOpsController.latestOrders);
router.get('/top-products', requirePermission('products', 'read'), adminOpsController.topProducts);
router.get('/low-stock', requirePermission('inventory', 'read'), adminOpsController.lowStock);
router.get('/recent-customers', requirePermission('customers', 'read'), adminOpsController.recentCustomers);

module.exports = router;
