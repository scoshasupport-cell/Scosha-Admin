const productService = require('../services/product.service');
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
  const result = await productService.list(req.query, { publicOnly: true, isVip });
  return ApiResponse.success(res, result.data, 'Products fetched', 200, result.meta);
});

const listAdmin = asyncHandler(async (req, res) => {
  const result = await productService.list(req.query, { publicOnly: false });
  return ApiResponse.success(res, result.data, 'Products fetched', 200, result.meta);
});

const getBySlug = asyncHandler(async (req, res) => {
  const isVip = await resolveIsVip(req);
  const product = await productService.getBySlug(req.params.slug, { isVip });
  return ApiResponse.success(res, product, 'Product fetched');
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id, { includeInactive: true });
  return ApiResponse.success(res, product, 'Product fetched');
});

const getRelated = asyncHandler(async (req, res) => {
  const isVip = await resolveIsVip(req);
  const related = await productService.getRelated(req.params.id, req.query.limit, { isVip });
  return ApiResponse.success(res, related, 'Related products fetched');
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);
  return ApiResponse.created(res, product, 'Product created');
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.update(req.params.id, req.body);
  return ApiResponse.success(res, product, 'Product updated');
});

const updateFlags = asyncHandler(async (req, res) => {
  const product = await productService.updateFlags(req.params.id, req.body);
  return ApiResponse.success(res, product, 'Product flags updated');
});

const setRelated = asyncHandler(async (req, res) => {
  const product = await productService.setRelated(req.params.id, req.body.relatedProductIds);
  return ApiResponse.success(res, product, 'Related products updated');
});

const updateSeo = asyncHandler(async (req, res) => {
  const product = await productService.updateSeo(req.params.id, req.body.seo);
  return ApiResponse.success(res, product, 'Product SEO updated');
});

const remove = asyncHandler(async (req, res) => {
  const product = await productService.remove(req.params.id);
  return ApiResponse.success(res, product, 'Product archived');
});

module.exports = {
  listPublic,
  listAdmin,
  getBySlug,
  getById,
  getRelated,
  create,
  update,
  updateFlags,
  setRelated,
  updateSeo,
  remove,
};
