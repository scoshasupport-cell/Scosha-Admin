const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const {
  setCustomerAuthCookies,
  clearCustomerAuthCookies,
} = require('../utils/tokens');

function withoutTokens(data) {
  if (!data || typeof data !== 'object') return data;
  const { accessToken, refreshToken, ...rest } = data;
  return rest;
}

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  if (data.accessToken) {
    setCustomerAuthCookies(res, data.accessToken, data.refreshToken);
  }
  return ApiResponse.created(res, withoutTokens(data), data.message);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  setCustomerAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { user: result.user }, 'Email verified successfully');
});

const resendOtp = asyncHandler(async (req, res) => {
  const data = await authService.resendOtp(req.body);
  return ApiResponse.success(res, data, data.message);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setCustomerAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { user: result.user }, 'Login successful');
});

const google = asyncHandler(async (req, res) => {
  const result = await authService.googleLogin(req.body);
  setCustomerAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { user: result.user }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refresh(token);
  setCustomerAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { user: result.user }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  if (req.user?.id) await authService.logout(req.user.id);
  clearCustomerAuthCookies(res);
  return ApiResponse.success(res, null, 'Logged out');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.body);
  return ApiResponse.success(res, data, data.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);
  clearCustomerAuthCookies(res);
  return ApiResponse.success(res, data, data.message);
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user.id, req.body);
  clearCustomerAuthCookies(res);
  return ApiResponse.success(res, data, data.message);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return ApiResponse.success(res, user, 'Profile fetched');
});

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  google,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
};
