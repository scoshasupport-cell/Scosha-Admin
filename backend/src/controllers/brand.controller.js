const brandService = require('../services/brand.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const listPublic = asyncHandler(async (req, res) => {
  const result = await brandService.list(req.query, { publicOnly: true });
  return ApiResponse.success(res, result.data, 'Brands fetched', 200, result.meta);
});

const listAdmin = asyncHandler(async (req, res) => {
  const result = await brandService.list(req.query, { publicOnly: false });
  return ApiResponse.success(res, result.data, 'Brands fetched', 200, result.meta);
});

const getBySlug = asyncHandler(async (req, res) => {
  const brand = await brandService.getBySlug(req.params.slug);
  return ApiResponse.success(res, brand, 'Brand fetched');
});

const getById = asyncHandler(async (req, res) => {
  const brand = await brandService.getById(req.params.id);
  return ApiResponse.success(res, brand, 'Brand fetched');
});

const create = asyncHandler(async (req, res) => {
  const brand = await brandService.create(req.body);
  return ApiResponse.created(res, brand, 'Brand created');
});

const update = asyncHandler(async (req, res) => {
  const brand = await brandService.update(req.params.id, req.body);
  return ApiResponse.success(res, brand, 'Brand updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const brand = await brandService.softUpdateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, brand, 'Brand status updated');
});

const remove = asyncHandler(async (req, res) => {
  const brand = await brandService.remove(req.params.id);
  return ApiResponse.success(res, brand, 'Brand deactivated');
});

module.exports = {
  listPublic,
  listAdmin,
  getBySlug,
  getById,
  create,
  update,
  updateStatus,
  remove,
};
