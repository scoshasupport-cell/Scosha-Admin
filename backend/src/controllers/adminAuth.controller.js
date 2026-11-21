const adminAuthService = require('../services/adminAuth.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const {
  setAdminAuthCookies,
  clearAdminAuthCookies,
} = require('../utils/tokens');

const login = asyncHandler(async (req, res) => {
  const result = await adminAuthService.login(req.body);
  setAdminAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { admin: result.admin }, 'Admin login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.adminRefreshToken || req.body?.refreshToken;
  const result = await adminAuthService.refresh(token);
  setAdminAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { admin: result.admin }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  if (req.admin?.id) await adminAuthService.logout(req.admin.id);
  clearAdminAuthCookies(res);
  return ApiResponse.success(res, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  const admin = await adminAuthService.getMe(req.admin.id);
  return ApiResponse.success(res, admin, 'Admin profile fetched');
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await adminAuthService.changePassword(req.admin.id, req.body);
  clearAdminAuthCookies(res);
  return ApiResponse.success(res, data, data.message);
});

module.exports = {
  login,
  refresh,
  logout,
  me,
  changePassword,
};
