const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { paginationQuery, exportQuery } = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('newsletter', 'read'), validate(paginationQuery, 'query'), contentController.listNewsletter);
router.get('/export', requirePermission('newsletter', 'read'), validate(exportQuery, 'query'), contentController.exportNewsletter);

module.exports = router;
