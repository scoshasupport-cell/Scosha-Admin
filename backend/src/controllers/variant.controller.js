const variantService = require('../services/variant.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const listByProduct = asyncHandler(async (req, res) => {
  const result = await variantService.listByProduct(req.params.id, req.query);
  return ApiResponse.success(res, result.data, 'Variants fetched', 200, result.meta);
});

const getById = asyncHandler(async (req, res) => {
  const variant = await variantService.getById(req.params.variantId);
  return ApiResponse.success(res, variant, 'Variant fetched');
});

const create = asyncHandler(async (req, res) => {
  const variant = await variantService.create(req.params.id, req.body);
  return ApiResponse.created(res, variant, 'Variant created');
});

const update = asyncHandler(async (req, res) => {
  const variant = await variantService.update(req.params.id, req.params.variantId, req.body);
  return ApiResponse.success(res, variant, 'Variant updated');
});

const remove = asyncHandler(async (req, res) => {
  const variant = await variantService.remove(req.params.id, req.params.variantId);
  return ApiResponse.success(res, variant, 'Variant deactivated');
});

const listLowStock = asyncHandler(async (req, res) => {
  const result = await variantService.listLowStock(req.query);
  return ApiResponse.success(res, result.data, 'Inventory fetched', 200, result.meta);
});

const setStock = asyncHandler(async (req, res) => {
  const variant = await variantService.setStock(req.params.variantId, req.body.stock);
  return ApiResponse.success(res, variant, 'Stock updated');
});

const adjustStock = asyncHandler(async (req, res) => {
  const variant = await variantService.adjustStock(req.params.variantId, req.body.delta);
  return ApiResponse.success(res, variant, 'Stock adjusted');
});

module.exports = {
  listByProduct,
  getById,
  create,
  update,
  remove,
  listLowStock,
  setStock,
  adjustStock,
};
