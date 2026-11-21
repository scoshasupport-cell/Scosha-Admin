const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('../utils/cloudinaryStorage');
const multer = require('multer');
const { env } = require('./env');

const isConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function createUploader(folder = env.CLOUDINARY_FOLDER, options = {}) {
  if (!isConfigured) {
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: options.fileSize || 5 * 1024 * 1024 },
    });
  }

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `${env.CLOUDINARY_FOLDER}/${folder}`.replace(/\/+/g, '/'),
      allowed_formats: options.allowedFormats || ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: options.transformation || [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });

  return multer({
    storage,
    limits: { fileSize: options.fileSize || 5 * 1024 * 1024 },
  });
}

module.exports = {
  cloudinary,
  isConfigured,
  createUploader,
};
