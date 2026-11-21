const express = require('express');
const mediaController = require('../../controllers/media.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { uploadMedia } = require('../../middlewares/upload');
const { mediaQuery, idParams } = require('../../validators/media.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('media', 'read'), validate(mediaQuery, 'query'), mediaController.list);
router.post(
  '/upload',
  requirePermission('media', 'create'),
  uploadMedia,
  mediaController.upload
);
router.get('/:id', requirePermission('media', 'read'), validate(idParams, 'params'), mediaController.getById);
router.put(
  '/:id',
  requirePermission('media', 'update'),
  validate(idParams, 'params'),
  uploadMedia,
  mediaController.replace
);
router.delete('/:id', requirePermission('media', 'delete'), validate(idParams, 'params'), mediaController.remove);

module.exports = router;
