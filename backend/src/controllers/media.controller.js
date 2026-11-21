const mediaService = require('../services/media.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const upload = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    throw ApiError.badRequest('No files uploaded. Use field name "files".');
  }

  const media = await mediaService.uploadMany(files, {
    uploadedBy: req.admin.id,
    uploadedByModel: 'Admin',
    folder: req.body.folder || 'media',
  });

  return ApiResponse.created(res, media, 'Media uploaded');
});

const list = asyncHandler(async (req, res) => {
  const result = await mediaService.list(req.query);
  return ApiResponse.success(res, result.data, 'Media fetched', 200, result.meta);
});

const getById = asyncHandler(async (req, res) => {
  const media = await mediaService.getById(req.params.id);
  return ApiResponse.success(res, media, 'Media fetched');
});

const remove = asyncHandler(async (req, res) => {
  const result = await mediaService.remove(req.params.id);
  return ApiResponse.success(res, result, 'Media deleted');
});

const replace = asyncHandler(async (req, res) => {
  const file = req.files?.[0] || req.file;
  const media = await mediaService.replace(req.params.id, file, {
    uploadedBy: req.admin.id,
    uploadedByModel: 'Admin',
    folder: req.body.folder,
  });
  return ApiResponse.success(res, media, 'Media replaced');
});

module.exports = {
  upload,
  list,
  getById,
  remove,
  replace,
};
