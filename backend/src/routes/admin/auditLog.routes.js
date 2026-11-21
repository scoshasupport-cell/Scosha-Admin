const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { paginationQuery } = require('../../validators/adminOps.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('audit', 'read'), validate(paginationQuery, 'query'), adminOpsController.listAuditLogs);

module.exports = router;
