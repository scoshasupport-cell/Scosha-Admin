const express = require('express');
const couponController = require('../../controllers/coupon.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  createCouponSchema,
  updateCouponSchema,
  paginationQuery,
  idParams,
} = require('../../validators/coupon.validator');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('coupons', 'read'), validate(paginationQuery, 'query'), couponController.list);
router.post('/', requirePermission('coupons', 'create'), validate(createCouponSchema), couponController.create);
router.get('/:id', requirePermission('coupons', 'read'), validate(idParams, 'params'), couponController.getById);
router.put(
  '/:id',
  requirePermission('coupons', 'update'),
  validateRequest({ params: idParams, body: updateCouponSchema }),
  couponController.update
);
router.patch(
  '/:id',
  requirePermission('coupons', 'update'),
  validateRequest({ params: idParams, body: updateCouponSchema }),
  couponController.update
);
router.delete('/:id', requirePermission('coupons', 'delete'), validate(idParams, 'params'), couponController.remove);

module.exports = router;
