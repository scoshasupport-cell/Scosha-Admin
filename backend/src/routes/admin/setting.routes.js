const express = require('express');
const settingController = require('../../controllers/setting.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { updateSettingsSchema } = require('../../validators/setting.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('settings', 'read'), settingController.getAdmin);
router.put('/', requirePermission('settings', 'update'), validate(updateSettingsSchema), settingController.update);

module.exports = router;
