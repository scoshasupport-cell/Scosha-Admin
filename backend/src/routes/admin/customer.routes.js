const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const { paginationQuery, idParams } = require('../../validators/adminOps.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('customers', 'read'), validate(paginationQuery, 'query'), adminOpsController.listCustomers);
router.get('/:id', requirePermission('customers', 'read'), validate(idParams, 'params'), adminOpsController.getCustomer);
router.delete('/:id', requirePermission('customers', 'delete'), validate(idParams, 'params'), adminOpsController.deleteCustomer);

module.exports = router;
