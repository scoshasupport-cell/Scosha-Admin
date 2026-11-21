const express = require('express');
const orderController = require('../../controllers/order.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  idParams,
  listOrdersQuery,
  updateStatusBody,
  refundBody,
  trackingBody,
} = require('../../validators/order.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get(
  '/',
  requirePermission('orders', 'read'),
  validate(listOrdersQuery, 'query'),
  orderController.listOrders
);

router.get(
  '/:id/packing-slip',
  requirePermission('orders', 'read'),
  validate(idParams, 'params'),
  orderController.downloadPackingSlip
);

router.get(
  '/:id',
  requirePermission('orders', 'read'),
  validate(idParams, 'params'),
  orderController.getOrder
);

router.patch(
  '/:id/status',
  requirePermission('orders', 'update'),
  validateRequest({ params: idParams, body: updateStatusBody }),
  orderController.updateStatus
);

router.post(
  '/:id/refund',
  requirePermission('orders', 'update'),
  validateRequest({ params: idParams, body: refundBody }),
  orderController.refundOrder
);

router.patch(
  '/:id/tracking',
  requirePermission('orders', 'update'),
  validateRequest({ params: idParams, body: trackingBody }),
  orderController.setTracking
);

module.exports = router;
