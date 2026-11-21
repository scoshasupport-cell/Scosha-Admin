const categoryService = require('../services/category.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const listPublic = asyncHandler(async (req, res) => {
  const result = await categoryService.list(req.query, { publicOnly: true });
  return ApiResponse.success(res, result.data, 'Categories fetched', 200, result.meta);
});

const listAdmin = asyncHandler(async (req, res) => {
  const result = await categoryService.list(req.query, { publicOnly: false });
  return ApiResponse.success(res, result.data, 'Categories fetched', 200, result.meta);
});

const getTree = asyncHandler(async (req, res) => {
  const publicOnly = req.admin ? false : true;
  const tree = await categoryService.getTree({ publicOnly });
  return ApiResponse.success(res, tree, 'Category tree fetched');
});

const getBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getBySlug(req.params.slug);
  return ApiResponse.success(res, category, 'Category fetched');
});

const getById = asyncHandler(async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  return ApiResponse.success(res, category, 'Category fetched');
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body);
  return ApiResponse.created(res, category, 'Category created');
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  return ApiResponse.success(res, category, 'Category updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const category = await categoryService.softUpdateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, category, 'Category status updated');
});

const reorder = asyncHandler(async (req, res) => {
  const tree = await categoryService.reorder(req.body.items);
  return ApiResponse.success(res, tree, 'Categories reordered');
});

const remove = asyncHandler(async (req, res) => {
  const category = await categoryService.remove(req.params.id);
  return ApiResponse.success(res, category, 'Category deactivated');
});

module.exports = {
  listPublic,
  listAdmin,
  getTree,
  getBySlug,
  getById,
  create,
  update,
  updateStatus,
  reorder,
  remove,
};
