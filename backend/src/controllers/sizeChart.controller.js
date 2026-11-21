const sizeChartService = require('../services/sizeChart.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const listAdmin = asyncHandler(async (req, res) => {
  const result = await sizeChartService.listCharts(req.query);
  return ApiResponse.success(res, result.items, 'Size charts fetched', 200, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: Math.max(1, Math.ceil(result.total / (result.limit || 1))),
    hasNext: result.page * result.limit < result.total,
    hasPrev: result.page > 1,
  });
});

const listPublic = asyncHandler(async (req, res) => {
  const result = await sizeChartService.listCharts({ ...req.query, status: 'active' });
  return ApiResponse.success(res, result.items, 'Active size charts fetched', 200, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: Math.max(1, Math.ceil(result.total / (result.limit || 1))),
    hasNext: result.page * result.limit < result.total,
    hasPrev: result.page > 1,
  });
});

const getById = asyncHandler(async (req, res) => {
  const chart = await sizeChartService.getChartById(req.params.id);
  if (!chart) {
    throw ApiError.notFound('Size chart not found');
  }
  return ApiResponse.success(res, chart, 'Size chart fetched');
});

const resolve = asyncHandler(async (req, res) => {
  const { gender, category, brandId } = req.query;
  const chart = await sizeChartService.resolveChart(gender, category, brandId);
  return ApiResponse.success(res, chart, 'Size chart resolved');
});

const create = asyncHandler(async (req, res) => {
  const chart = await sizeChartService.createChart(req.body);
  return ApiResponse.created(res, chart, 'Size chart created');
});

const update = asyncHandler(async (req, res) => {
  const chart = await sizeChartService.updateChart(req.params.id, req.body);
  return ApiResponse.success(res, chart, 'Size chart updated');
});

const remove = asyncHandler(async (req, res) => {
  await sizeChartService.deleteChart(req.params.id);
  return ApiResponse.success(res, null, 'Size chart deleted');
});

module.exports = {
  listAdmin,
  listPublic,
  getById,
  resolve,
  create,
  update,
  remove,
};
