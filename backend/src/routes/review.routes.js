const express = require('express');
const reviewController = require('../controllers/review.controller');
const { validate, validateRequest } = require('../middlewares/validate');
const { authenticateCustomer } = require('../middlewares/auth');
const {
  paginationQuery,
  createReviewSchema,
  updateReviewSchema,
  idParams,
} = require('../validators/review.validator');

const router = express.Router();

router.get('/', validate(paginationQuery, 'query'), reviewController.listPublic);
router.post('/', authenticateCustomer, validate(createReviewSchema), reviewController.create);
router.put(
  '/:id',
  authenticateCustomer,
  validateRequest({ params: idParams, body: updateReviewSchema }),
  reviewController.update
);
router.delete('/:id', authenticateCustomer, validate(idParams, 'params'), reviewController.remove);

module.exports = router;
