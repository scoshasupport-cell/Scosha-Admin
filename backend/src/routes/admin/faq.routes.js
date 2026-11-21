const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createFaqSchema,
  updateFaqSchema,
} = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('faqs', 'read'), validate(paginationQuery, 'query'), contentController.listFaqsAdmin);
router.post('/', requirePermission('faqs', 'create'), validate(createFaqSchema), contentController.createFaq);
router.get('/:id', requirePermission('faqs', 'read'), validate(idParams, 'params'), contentController.getFaq);
router.put(
  '/:id',
  requirePermission('faqs', 'update'),
  validateRequest({ params: idParams, body: updateFaqSchema }),
  contentController.updateFaq
);
router.patch(
  '/:id',
  requirePermission('faqs', 'update'),
  validateRequest({ params: idParams, body: updateFaqSchema }),
  contentController.updateFaq
);
router.delete('/:id', requirePermission('faqs', 'delete'), validate(idParams, 'params'), contentController.deleteFaq);

module.exports = router;
