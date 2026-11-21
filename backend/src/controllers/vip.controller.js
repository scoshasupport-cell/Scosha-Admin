const vipService = require('../services/vip.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const checkEmail = asyncHandler(async (req, res) => {
  const result = await vipService.checkVipByEmail(req.body.email);
  return ApiResponse.success(res, result, 'VIP check complete');
});

const acknowledgeCongrats = asyncHandler(async (req, res) => {
  const result = await vipService.acknowledgeCongrats(req.user.id);
  return ApiResponse.success(res, result, 'VIP congratulations acknowledged');
});

const myStatus = asyncHandler(async (req, res) => {
  const result = await vipService.getVipStatus(req.user.id);
  return ApiResponse.success(res, result, 'VIP status fetched');
});

const adminUpdate = asyncHandler(async (req, res) => {
  const updated = await vipService.adminUpdateVip(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, updated, 'VIP membership updated');
});

const adminBroadcast = asyncHandler(async (req, res) => {
  const result = await vipService.adminBroadcastEarlyAccess(req.body);
  return ApiResponse.success(res, result, 'VIP early-access announcement queued');
});

module.exports = {
  checkEmail,
  acknowledgeCongrats,
  myStatus,
  adminUpdate,
  adminBroadcast,
};
