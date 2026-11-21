const test = require('node:test');
const assert = require('node:assert/strict');
const mediaService = require('./media.service');
const mediaRepository = require('../repositories/media.repository');

const uploaded = {
  path: 'https://res.example.test/coat.jpg',
  filename: 'local/coat',
  originalname: 'coat.jpg',
  mimetype: 'image/jpeg',
  size: 4,
};

test('uploadMany rejects empty files and missing uploader', async () => {
  await assert.rejects(() => mediaService.uploadMany([], { uploadedBy: 1 }), /No files uploaded/);
  await assert.rejects(() => mediaService.uploadMany([uploaded], {}), /Uploader identity required/);
});

test('resolveUpload accepts an already-uploaded multer file without calling Cloudinary', async () => {
  const resolved = await mediaService.resolveUpload(uploaded, 'products');
  assert.equal(resolved.url, uploaded.path);
  assert.equal(resolved.publicId, 'local/coat');
});

test('uploadMany does not leave a media row when the database write fails', async () => {
  const original = mediaRepository.createMany;
  mediaRepository.createMany = async () => {
    throw new Error('db down');
  };
  try {
    await assert.rejects(() => mediaService.uploadMany([uploaded], { uploadedBy: 9 }), /db down/);
  } finally {
    mediaRepository.createMany = original;
  }
});

test('replace does not destroy the old image until the database update succeeds', async () => {
  const originalFind = mediaRepository.findById;
  const originalUpdate = mediaRepository.updateById;
  mediaRepository.findById = async () => ({
    id: 3,
    publicId: 'old-id',
    folder: 'media',
    resourceType: 'image',
    uploadedBy: 1,
    uploadedByModel: 'Admin',
  });
  mediaRepository.updateById = async () => {
    throw new Error('update failed');
  };
  try {
    await assert.rejects(() => mediaService.replace(3, uploaded), /update failed/);
  } finally {
    mediaRepository.findById = originalFind;
    mediaRepository.updateById = originalUpdate;
  }
});
