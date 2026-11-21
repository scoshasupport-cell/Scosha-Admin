const express = require('express');
const wishlistController = require('../controllers/wishlist.controller');
const { validate } = require('../middlewares/validate');
const { authenticateCustomer } = require('../middlewares/auth');
const { productIdParams } = require('../validators/wishlist.validator');

const router = express.Router();

router.use(authenticateCustomer);

router.get('/', wishlistController.getWishlist);
router.post(
  '/:productId/move-to-cart',
  validate(productIdParams, 'params'),
  wishlistController.moveToCart
);
router.post('/:productId', validate(productIdParams, 'params'), wishlistController.addProduct);
router.delete('/:productId', validate(productIdParams, 'params'), wishlistController.removeProduct);

module.exports = router;
