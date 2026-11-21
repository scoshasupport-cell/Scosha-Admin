const settingService = require('../services/setting.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const getPublic = asyncHandler(async (_req, res) => {
  const settings = await settingService.getPublic();
  return ApiResponse.success(res, settings, 'Settings fetched');
});

const getAdmin = asyncHandler(async (_req, res) => {
  const settings = await settingService.getAdmin();
  return ApiResponse.success(res, settings, 'Settings fetched');
});

const update = asyncHandler(async (req, res) => {
  const settings = await settingService.update(req.body, req.admin.id, req);
  return ApiResponse.success(res, settings, 'Settings updated');
});

module.exports = {
  getPublic,
  getAdmin,
  update,
};
