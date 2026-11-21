const { Readable } = require('stream');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const { env } = require('../config/env');
const mediaRepository = require('../repositories/media.repository');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { parseId } = require('../utils/prismaHelpers');

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || `${env.CLOUDINARY_FOLDER}/media`,
        resource_type: options.resourceType || 'image',
        ...options.params,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

function mapCloudinaryResult(result, file, meta) {
  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    folder: result.folder || meta.folder,
    resourceType: result.resource_type || 'image',
    width: result.width,
    height: result.height,
    format: result.format,
    size: result.bytes || file.size,
    uploadedBy: meta.uploadedBy != null ? parseId(meta.uploadedBy) : null,
    uploadedByModel: meta.uploadedByModel,
  };
}

async function resolveUpload(file, folder) {
  if (file.path && (file.filename || file.public_id)) {
    return {
      url: file.path,
      publicId: file.filename || file.public_id,
      folder,
      resourceType: 'image',
      width: file.width,
      height: file.height,
      format: file.format,
      size: file.size,
    };
  }

  if (file.buffer) {
    if (!isConfigured) {
      const fakeId = `local/${Date.now()}-${file.originalname}`;
      return {
        url: `memory://${fakeId}`,
        publicId: fakeId,
        folder,
        resourceType: 'image',
        width: null,
        height: null,
        format: file.mimetype?.split('/')[1],
        size: file.size,
      };
    }
    const result = await uploadBuffer(file.buffer, {
      folder: `${env.CLOUDINARY_FOLDER}/${folder}`.replace(/\/+/g, '/'),
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      folder: result.folder,
      resourceType: result.resource_type,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    };
  }

  throw ApiError.badRequest('Invalid uploaded file');
}

async function destroyUploaded(publicId, resourceType) {
  if (!isConfigured || !publicId || String(publicId).startsWith('local/')) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'image' });
  } catch {
    // compensating cleanup is best-effort
  }
}

async function uploadMany(files = [], { uploadedBy, uploadedByModel = 'Admin', folder = 'media' } = {}) {
  if (!files.length) {
    throw ApiError.badRequest('No files uploaded');
  }
  if (!uploadedBy) {
    throw ApiError.unauthorized('Uploader identity required');
  }

  const docs = [];
  try {
    for (const file of files) {
      const resolved = await resolveUpload(file, folder);
      docs.push({
        ...resolved,
        uploadedBy: parseId(uploadedBy),
        uploadedByModel,
      });
    }
    return await mediaRepository.createMany(docs);
  } catch (error) {
    await Promise.all(docs.map((doc) => destroyUploaded(doc.publicId, doc.resourceType)));
    throw error;
  }
}

async function list(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.folder) filter.folder = query.folder;
  if (query.uploadedBy) filter.uploadedBy = parseId(query.uploadedBy);

  const [data, total] = await Promise.all([
    mediaRepository.find(filter, { skip, limit }),
    mediaRepository.count(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

async function getById(id) {
  const media = await mediaRepository.findById(id);
  if (!media) throw ApiError.notFound('Media not found');
  return media;
}

async function remove(id) {
  const media = await mediaRepository.findById(id);
  if (!media) throw ApiError.notFound('Media not found');

  await mediaRepository.deleteById(id);
  await destroyUploaded(media.publicId, media.resourceType);
  return { deleted: true, id: parseId(id) };
}

async function replace(id, file, meta = {}) {
  if (!file) throw ApiError.badRequest('Replacement file required');
  const existing = await mediaRepository.findById(id);
  if (!existing) throw ApiError.notFound('Media not found');

  const folder = meta.folder || existing.folder || 'media';
  const resolved = await resolveUpload(file, folder);

  try {
    const updated = await mediaRepository.updateById(id, {
      ...resolved,
      uploadedBy: parseId(meta.uploadedBy) || existing.uploadedBy,
      uploadedByModel: meta.uploadedByModel || existing.uploadedByModel,
    });
    await destroyUploaded(existing.publicId, existing.resourceType);
    return updated;
  } catch (error) {
    await destroyUploaded(resolved.publicId, resolved.resourceType);
    throw error;
  }
}

module.exports = {
  uploadMany,
  list,
  getById,
  remove,
  replace,
  resolveUpload,
  destroyUploaded,
  mapCloudinaryResult,
};
