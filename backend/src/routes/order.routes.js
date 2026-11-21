const express = require('express');
const orderController = require('../controllers/order.controller');
const { validate } = require('../middlewares/validate');
const { authenticateCustomer, requireEmailVerified } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const {
  previewBody,
  createOrderBody,
  myOrdersQuery,
  idParams,
} = require('../validators/order.validator');

const router = express.Router();

router.use(authenticateCustomer);

router.post('/preview', authLimiter, validate(previewBody), orderController.previewCheckout);
router.post('/', authLimiter, requireEmailVerified, validate(createOrderBody), orderController.createOrder);
router.get('/', validate(myOrdersQuery, 'query'), orderController.listMyOrders);
router.get('/:id', validate(idParams, 'params'), orderController.getMyOrder);
// Customers cannot cancel orders — only admin can cancel via /admin/orders

module.exports = router;
