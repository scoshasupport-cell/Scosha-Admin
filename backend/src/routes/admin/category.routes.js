const express = require('express');
const categoryController = require('../../controllers/category.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  createCategorySchema,
  updateCategorySchema,
  reorderSchema,
  categoryQuery,
  statusSchema,
  idParams,
} = require('../../validators/category.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('categories', 'read'), validate(categoryQuery, 'query'), categoryController.listAdmin);
router.get('/tree', requirePermission('categories', 'read'), categoryController.getTree);
router.post('/', requirePermission('categories', 'create'), validate(createCategorySchema), categoryController.create);
router.patch('/reorder', requirePermission('categories', 'update'), validate(reorderSchema), categoryController.reorder);

router.get('/:id', requirePermission('categories', 'read'), validate(idParams, 'params'), categoryController.getById);
router.patch(
  '/:id',
  requirePermission('categories', 'update'),
  validateRequest({ params: idParams, body: updateCategorySchema }),
  categoryController.update
);
router.patch(
  '/:id/status',
  requirePermission('categories', 'update'),
  validateRequest({ params: idParams, body: statusSchema }),
  categoryController.updateStatus
);
router.delete('/:id', requirePermission('categories', 'delete'), validate(idParams, 'params'), categoryController.remove);

module.exports = router;
