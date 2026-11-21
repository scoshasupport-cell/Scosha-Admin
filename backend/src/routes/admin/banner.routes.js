const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createBannerSchema,
  updateBannerSchema,
} = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('banners', 'read'), validate(paginationQuery, 'query'), contentController.listBannersAdmin);
router.post('/', requirePermission('banners', 'create'), validate(createBannerSchema), contentController.createBanner);
router.get('/:id', requirePermission('banners', 'read'), validate(idParams, 'params'), contentController.getBanner);
router.put(
  '/:id',
  requirePermission('banners', 'update'),
  validateRequest({ params: idParams, body: updateBannerSchema }),
  contentController.updateBanner
);
router.patch(
  '/:id',
  requirePermission('banners', 'update'),
  validateRequest({ params: idParams, body: updateBannerSchema }),
  contentController.updateBanner
);
router.delete('/:id', requirePermission('banners', 'delete'), validate(idParams, 'params'), contentController.deleteBanner);

module.exports = router;
