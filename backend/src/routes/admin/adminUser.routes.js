const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createAdminSchema,
  updateAdminSchema,
} = require('../../validators/adminOps.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('admins', 'read'), validate(paginationQuery, 'query'), adminOpsController.listAdmins);
router.post('/', requirePermission('admins', 'create'), validate(createAdminSchema), adminOpsController.createAdmin);
router.get('/:id', requirePermission('admins', 'read'), validate(idParams, 'params'), adminOpsController.getAdmin);
router.put(
  '/:id',
  requirePermission('admins', 'update'),
  validateRequest({ params: idParams, body: updateAdminSchema }),
  adminOpsController.updateAdmin
);
router.patch(
  '/:id',
  requirePermission('admins', 'update'),
  validateRequest({ params: idParams, body: updateAdminSchema }),
  adminOpsController.updateAdmin
);
router.delete('/:id', requirePermission('admins', 'delete'), validate(idParams, 'params'), adminOpsController.deleteAdmin);

module.exports = router;
