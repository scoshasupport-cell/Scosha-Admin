const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  contactReplySchema,
} = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('contact', 'read'), validate(paginationQuery, 'query'), contentController.listContactMessages);
router.get('/:id', requirePermission('contact', 'read'), validate(idParams, 'params'), contentController.getContactMessage);
router.patch('/:id/read', requirePermission('contact', 'update'), validate(idParams, 'params'), contentController.markContactRead);
router.post(
  '/:id/reply',
  requirePermission('contact', 'update'),
  validateRequest({ params: idParams, body: contactReplySchema }),
  contentController.replyContact
);

module.exports = router;
