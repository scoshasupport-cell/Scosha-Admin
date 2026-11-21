const express = require('express');
const brandController = require('../../controllers/brand.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  createBrandSchema,
  updateBrandSchema,
  paginationQuery,
  statusSchema,
  idParams,
} = require('../../validators/brand.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('brands', 'read'), validate(paginationQuery, 'query'), brandController.listAdmin);
router.post('/', requirePermission('brands', 'create'), validate(createBrandSchema), brandController.create);
router.get('/:id', requirePermission('brands', 'read'), validate(idParams, 'params'), brandController.getById);
router.patch(
  '/:id',
  requirePermission('brands', 'update'),
  validateRequest({ params: idParams, body: updateBrandSchema }),
  brandController.update
);
router.patch(
  '/:id/status',
  requirePermission('brands', 'update'),
  validateRequest({ params: idParams, body: statusSchema }),
  brandController.updateStatus
);
router.delete('/:id', requirePermission('brands', 'delete'), validate(idParams, 'params'), brandController.remove);

module.exports = router;
