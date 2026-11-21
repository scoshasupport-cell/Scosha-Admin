const multer = require('multer');
const { CloudinaryStorage } = require('../utils/cloudinaryStorage');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function sanitizePublicId(originalname) {
  const stem = String(originalname || 'file').replace(/\.[^.]+$/, '');
  return `${Date.now()}-${stem.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`), false);
  }
  return cb(null, true);
}

function buildStorage(folder) {
  if (!isConfigured) {
    return multer.memoryStorage();
  }

  return new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
      folder: `${env.CLOUDINARY_FOLDER}/${folder}`.replace(/\/+/g, '/'),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      public_id: sanitizePublicId(file.originalname),
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    }),
  });
}

/**
 * Multer uploader for catalog media (multiple images).
 * Uses Cloudinary storage when configured; otherwise memory storage
 * so media.service can stream buffers to Cloudinary or store placeholders.
 */
function createUploadMiddleware(options = {}) {
  const {
    folder = 'products',
    maxCount = 10,
    fieldName = 'images',
    fileSize = 5 * 1024 * 1024,
  } = options;

  const upload = multer({
    storage: buildStorage(folder),
    limits: { fileSize, files: maxCount },
    fileFilter,
  });

  return upload.array(fieldName, maxCount);
}

const uploadProductImages = createUploadMiddleware({ folder: 'products', maxCount: 10 });
const uploadBrandImages = createUploadMiddleware({ folder: 'brands', maxCount: 5 });
const uploadCategoryImages = createUploadMiddleware({ folder: 'categories', maxCount: 5 });
const uploadMedia = createUploadMiddleware({ folder: 'media', maxCount: 20, fieldName: 'files' });

module.exports = {
  createUploadMiddleware,
  uploadProductImages,
  uploadBrandImages,
  uploadCategoryImages,
  uploadMedia,
  ALLOWED_MIME,
  fileFilter,
  sanitizePublicId,
};
