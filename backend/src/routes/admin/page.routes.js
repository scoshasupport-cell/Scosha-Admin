const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createPageSchema,
  updatePageSchema,
} = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('pages', 'read'), validate(paginationQuery, 'query'), contentController.listPagesAdmin);
router.post('/', requirePermission('pages', 'create'), validate(createPageSchema), contentController.createPage);
router.get('/:id', requirePermission('pages', 'read'), validate(idParams, 'params'), contentController.getPageAdmin);
router.put(
  '/:id',
  requirePermission('pages', 'update'),
  validateRequest({ params: idParams, body: updatePageSchema }),
  contentController.updatePage
);
router.patch(
  '/:id',
  requirePermission('pages', 'update'),
  validateRequest({ params: idParams, body: updatePageSchema }),
  contentController.updatePage
);
router.delete('/:id', requirePermission('pages', 'delete'), validate(idParams, 'params'), contentController.deletePage);

module.exports = router;
