const express = require('express');
const reviewController = require('../../controllers/review.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  replySchema,
} = require('../../validators/review.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('reviews', 'read'), validate(paginationQuery, 'query'), reviewController.listAdmin);
router.patch(
  '/:id/approve',
  requirePermission('reviews', 'update'),
  validate(idParams, 'params'),
  reviewController.approve
);
router.patch(
  '/:id/reject',
  requirePermission('reviews', 'update'),
  validate(idParams, 'params'),
  reviewController.reject
);
router.post(
  '/:id/reply',
  requirePermission('reviews', 'update'),
  validateRequest({ params: idParams, body: replySchema }),
  reviewController.reply
);

module.exports = router;
