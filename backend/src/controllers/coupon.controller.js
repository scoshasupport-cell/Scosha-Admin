const couponService = require('../services/coupon.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const validate = asyncHandler(async (req, res) => {
  const result = await couponService.validateCoupon(req.body);
  return ApiResponse.success(res, result, 'Coupon is valid');
});

const list = asyncHandler(async (req, res) => {
  const result = await couponService.list(req.query);
  return ApiResponse.success(res, result.data, 'Coupons fetched', 200, result.meta);
});

const getById = asyncHandler(async (req, res) => {
  const coupon = await couponService.getById(req.params.id);
  return ApiResponse.success(res, coupon, 'Coupon fetched');
});

const create = asyncHandler(async (req, res) => {
  const coupon = await couponService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, coupon, 'Coupon created');
});

const update = asyncHandler(async (req, res) => {
  const coupon = await couponService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, coupon, 'Coupon updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await couponService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Coupon deleted');
});

module.exports = {
  validate,
  list,
  getById,
  create,
  update,
  remove,
};
