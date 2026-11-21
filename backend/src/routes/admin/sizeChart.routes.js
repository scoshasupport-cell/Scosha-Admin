const express = require('express');
const sizeChartController = require('../../controllers/sizeChart.controller');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('products', 'read'), sizeChartController.listAdmin);
router.post('/', requirePermission('products', 'create'), sizeChartController.create);
router.get('/:id', requirePermission('products', 'read'), sizeChartController.getById);
router.put('/:id', requirePermission('products', 'update'), sizeChartController.update);
router.delete('/:id', requirePermission('products', 'delete'), sizeChartController.remove);

module.exports = router;
