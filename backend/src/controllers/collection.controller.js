const collectionService = require('../services/collection.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { prisma } = require('../config/prisma');

async function resolveIsVip(req) {
  const id = Number(req.user?.id);
  if (!Number.isInteger(id) || id <= 0) return false;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { isVip: true, vipEarlyAccess: true, status: true },
  });
  return Boolean(user?.isVip && user.vipEarlyAccess !== false && user.status === 'active');
}

const listPublic = asyncHandler(async (req, res) => {
  const isVip = await resolveIsVip(req);
  const result = await collectionService.list(req.query, { publicOnly: true, isVip });
  return ApiResponse.success(res, result.data, 'Collections fetched', 200, result.meta);
});

const listAdmin = asyncHandler(async (req, res) => {
  const result = await collectionService.list(req.query, { publicOnly: false });
  return ApiResponse.success(res, result.data, 'Collections fetched', 200, result.meta);
});

const getBySlug = asyncHandler(async (req, res) => {
  const isVip = await resolveIsVip(req);
  const collection = await collectionService.getBySlug(req.params.slug, { isVip });
  return ApiResponse.success(res, collection, 'Collection fetched');
});

const getById = asyncHandler(async (req, res) => {
  const collection = await collectionService.getById(req.params.id);
  return ApiResponse.success(res, collection, 'Collection fetched');
});

const create = asyncHandler(async (req, res) => {
  const collection = await collectionService.create(req.body);
  return ApiResponse.created(res, collection, 'Collection created');
});

const update = asyncHandler(async (req, res) => {
  const collection = await collectionService.update(req.params.id, req.body);
  return ApiResponse.success(res, collection, 'Collection updated');
});

const setFeatured = asyncHandler(async (req, res) => {
  const collection = await collectionService.setFeatured(req.params.id, req.body.featured);
  return ApiResponse.success(res, collection, 'Collection featured flag updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const collection = await collectionService.softUpdateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, collection, 'Collection status updated');
});

const remove = asyncHandler(async (req, res) => {
  const collection = await collectionService.remove(req.params.id);
  return ApiResponse.success(res, collection, 'Collection deactivated');
});

module.exports = {
  listPublic,
  listAdmin,
  getBySlug,
  getById,
  create,
  update,
  setFeatured,
  updateStatus,
  remove,
};
