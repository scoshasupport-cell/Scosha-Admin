const express = require('express');
const adminOpsController = require('../../controllers/adminOps.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createRoleSchema,
  updateRoleSchema,
} = require('../../validators/adminOps.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('roles', 'read'), validate(paginationQuery, 'query'), adminOpsController.listRoles);
router.post('/', requirePermission('roles', 'create'), validate(createRoleSchema), adminOpsController.createRole);
router.get('/:id', requirePermission('roles', 'read'), validate(idParams, 'params'), adminOpsController.getRole);
router.put(
  '/:id',
  requirePermission('roles', 'update'),
  validateRequest({ params: idParams, body: updateRoleSchema }),
  adminOpsController.updateRole
);
router.patch(
  '/:id',
  requirePermission('roles', 'update'),
  validateRequest({ params: idParams, body: updateRoleSchema }),
  adminOpsController.updateRole
);
router.delete('/:id', requirePermission('roles', 'delete'), validate(idParams, 'params'), adminOpsController.deleteRole);

module.exports = router;
