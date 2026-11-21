const reviewService = require('../services/review.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const listPublic = asyncHandler(async (req, res) => {
  const query = { ...req.query };
  if (req.params.productId) query.productId = req.params.productId;
  const result = await reviewService.listPublic(query);
  return ApiResponse.success(res, result.data, 'Reviews fetched', 200, result.meta);
});

const listAdmin = asyncHandler(async (req, res) => {
  const result = await reviewService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Reviews fetched', 200, result.meta);
});

const create = asyncHandler(async (req, res) => {
  const review = await reviewService.create(req.user.id, req.body);
  return ApiResponse.created(res, review, 'Review submitted');
});

const update = asyncHandler(async (req, res) => {
  const review = await reviewService.updateOwn(req.params.id, req.user.id, req.body);
  return ApiResponse.success(res, review, 'Review updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteOwn(req.params.id, req.user.id);
  return ApiResponse.success(res, result, 'Review deleted');
});

const approve = asyncHandler(async (req, res) => {
  const review = await reviewService.setStatus(req.params.id, 'approved', req.admin.id, req);
  return ApiResponse.success(res, review, 'Review approved');
});

const reject = asyncHandler(async (req, res) => {
  const review = await reviewService.setStatus(req.params.id, 'rejected', req.admin.id, req);
  return ApiResponse.success(res, review, 'Review rejected');
});

const reply = asyncHandler(async (req, res) => {
  const review = await reviewService.reply(req.params.id, req.body.text, req.admin.id, req);
  return ApiResponse.success(res, review, 'Reply added');
});

module.exports = {
  listPublic,
  listAdmin,
  create,
  update,
  remove,
  approve,
  reject,
  reply,
};
