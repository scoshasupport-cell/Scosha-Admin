const express = require('express');
const productController = require('../controllers/product.controller');
const reviewController = require('../controllers/review.controller');
const { validate, validateRequest } = require('../middlewares/validate');
const { optionalAuth } = require('../middlewares/auth');
const {
  productQuery,
  slugParams,
  relatedParams,
  relatedQuery,
} = require('../validators/product.validator');
const { productIdParams, paginationQuery } = require('../validators/review.validator');

const router = express.Router();

router.get('/', optionalAuth, validate(productQuery, 'query'), productController.listPublic);

router.get(
  '/:id/related',
  optionalAuth,
  validateRequest({ params: relatedParams, query: relatedQuery }),
  productController.getRelated
);

router.get(
  '/:productId/reviews',
  optionalAuth,
  validateRequest({ params: productIdParams, query: paginationQuery }),
  reviewController.listPublic
);

router.get('/:slug', optionalAuth, validate(slugParams, 'params'), productController.getBySlug);

module.exports = router;
