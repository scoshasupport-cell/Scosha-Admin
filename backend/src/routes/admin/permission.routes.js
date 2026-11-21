const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('roles', 'read'), adminOpsController.listPermissions);

module.exports = router;
