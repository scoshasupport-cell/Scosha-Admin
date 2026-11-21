const express = require('express');
const collectionController = require('../../controllers/collection.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  createCollectionSchema,
  updateCollectionSchema,
  featuredSchema,
  collectionQuery,
  statusSchema,
  idParams,
} = require('../../validators/collection.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('collections', 'read'), validate(collectionQuery, 'query'), collectionController.listAdmin);
router.post('/', requirePermission('collections', 'create'), validate(createCollectionSchema), collectionController.create);
router.get('/:id', requirePermission('collections', 'read'), validate(idParams, 'params'), collectionController.getById);
router.patch(
  '/:id',
  requirePermission('collections', 'update'),
  validateRequest({ params: idParams, body: updateCollectionSchema }),
  collectionController.update
);
router.patch(
  '/:id/featured',
  requirePermission('collections', 'update'),
  validateRequest({ params: idParams, body: featuredSchema }),
  collectionController.setFeatured
);
router.patch(
  '/:id/status',
  requirePermission('collections', 'update'),
  validateRequest({ params: idParams, body: statusSchema }),
  collectionController.updateStatus
);
router.delete('/:id', requirePermission('collections', 'delete'), validate(idParams, 'params'), collectionController.remove);

module.exports = router;
