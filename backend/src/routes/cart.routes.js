const express = require('express');
const cartController = require('../controllers/cart.controller');
const { validate } = require('../middlewares/validate');
const { optionalAuth, authenticateCustomer } = require('../middlewares/auth');
const {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParams,
} = require('../validators/cart.validator');

const router = express.Router();

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, validate(addCartItemSchema), cartController.addItem);
router.patch(
  '/items/:itemId',
  optionalAuth,
  validate(cartItemParams, 'params'),
  validate(updateCartItemSchema),
  cartController.updateItem
);
router.delete(
  '/items/:itemId',
  optionalAuth,
  validate(cartItemParams, 'params'),
  cartController.removeItem
);
router.delete('/', optionalAuth, cartController.clearCart);
router.post('/merge', authenticateCustomer, cartController.mergeCart);

module.exports = router;
