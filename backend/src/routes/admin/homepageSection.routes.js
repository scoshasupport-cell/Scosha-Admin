const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createHomepageSectionSchema,
  updateHomepageSectionSchema,
} = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('homepage', 'read'), validate(paginationQuery, 'query'), contentController.listHomepageSections);
router.post('/', requirePermission('homepage', 'create'), validate(createHomepageSectionSchema), contentController.createHomepageSection);
router.get('/:id', requirePermission('homepage', 'read'), validate(idParams, 'params'), contentController.getHomepageSection);
router.put(
  '/:id',
  requirePermission('homepage', 'update'),
  validateRequest({ params: idParams, body: updateHomepageSectionSchema }),
  contentController.updateHomepageSection
);
router.patch(
  '/:id',
  requirePermission('homepage', 'update'),
  validateRequest({ params: idParams, body: updateHomepageSectionSchema }),
  contentController.updateHomepageSection
);
router.delete('/:id', requirePermission('homepage', 'delete'), validate(idParams, 'params'), contentController.deleteHomepageSection);

module.exports = router;
