const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, PassThrough } = require('node:stream');
const { CloudinaryStorage } = require('./cloudinaryStorage');

function fileStream(contents = 'image') {
  return Readable.from([Buffer.from(contents)]);
}

test('storage uploads through upload_stream and returns the adapter fields', async () => {
  const seen = [];
  const storage = new CloudinaryStorage({
    cloudinary: {
      uploader: {
        upload_stream(options, callback) {
          seen.push(options);
          const incoming = new PassThrough();
          incoming.on('finish', () => {
            callback(null, {
              secure_url: 'https://res.example.test/coat.jpg',
              bytes: 12,
              public_id: 'products/coat',
            });
          });
          return incoming;
        },
      },
    },
    params: async () => ({ folder: 'products', resource_type: 'image', public_id: 'coat' }),
  });

  const info = await new Promise((resolve, reject) => {
    storage._handleFile({}, { stream: fileStream('jpeg') }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

  assert.deepEqual(seen, [{ folder: 'products', resource_type: 'image', public_id: 'coat' }]);
  assert.deepEqual(info, {
    path: 'https://res.example.test/coat.jpg',
    size: 12,
    filename: 'products/coat',
  });
});

test('storage reports upload failures and does not invent a stored file', async () => {
  const storage = new CloudinaryStorage({
    cloudinary: {
      uploader: {
        upload_stream(_options, callback) {
          const incoming = new PassThrough();
          incoming.resume();
          callback(new Error('upload rejected'));
          return incoming;
        },
      },
    },
    params: { folder: 'products' },
  });

  await assert.rejects(
    () => new Promise((resolve, reject) => {
      storage._handleFile({}, { stream: fileStream() }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    }),
    /upload rejected/
  );
});

test('storage reports a broken upload stream once', async () => {
  const storage = new CloudinaryStorage({
    cloudinary: {
      uploader: {
        upload_stream() {
          return new PassThrough();
        },
      },
    },
    params: { folder: 'products' },
  });
  const broken = new PassThrough();

  const pending = new Promise((resolve, reject) => {
    storage._handleFile({}, { stream: broken }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  broken.destroy(new Error('stream interrupted'));

  await assert.rejects(pending, /stream interrupted/);
});

test('storage reports deletion failures from destroy', async () => {
  let destroyed = null;
  const storage = new CloudinaryStorage({
    cloudinary: {
      uploader: {
        destroy(publicId, options, callback) {
          destroyed = { publicId, options };
          callback(new Error('destroy failed'));
        },
      },
    },
  });

  await assert.rejects(
    () => new Promise((resolve, reject) => {
      storage._removeFile({}, { filename: 'products/coat' }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
    /destroy failed/
  );
  assert.deepEqual(destroyed, {
    publicId: 'products/coat',
    options: { invalidate: true },
  });
});
