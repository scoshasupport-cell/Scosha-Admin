const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { paginationQuery, idParams } = require('../../validators/adminOps.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('notifications', 'read'), validate(paginationQuery, 'query'), adminOpsController.listNotifications);
router.patch('/read-all', requirePermission('notifications', 'update'), adminOpsController.markAllNotificationsRead);
router.patch('/:id/read', requirePermission('notifications', 'update'), validate(idParams, 'params'), adminOpsController.markNotificationRead);

module.exports = router;
