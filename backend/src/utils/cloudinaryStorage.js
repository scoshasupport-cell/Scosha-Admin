/**
 * Multer storage engine for Cloudinary SDK 2.
 * Matches the file fields the previous multer-storage-cloudinary adapter produced:
 * path = secure_url, size = bytes, filename = public_id.
 */
class CloudinaryStorage {
  constructor(opts = {}) {
    if (!opts.cloudinary) {
      throw new Error('Cloudinary client is required');
    }
    this.cloudinary = opts.cloudinary;
    this.params = opts.params || {};
  }

  _handleFile(req, file, callback) {
    Promise.resolve()
      .then(() => this.resolveParams(req, file))
      .then((options) => this.upload(file, options))
      .then((response) => {
        callback(null, {
          path: response.secure_url,
          size: response.bytes,
          filename: response.public_id,
        });
      })
      .catch((error) => callback(error));
  }

  _removeFile(_req, file, callback) {
    this.cloudinary.uploader.destroy(file.filename, { invalidate: true }, (error, result) => {
      callback(error, result);
    });
  }

  async resolveParams(req, file) {
    if (typeof this.params === 'function') {
      return this.params(req, file);
    }

    const { public_id: publicId, ...rest } = this.params;
    const options = {};
    if (typeof publicId === 'function') options.public_id = await publicId(req, file);
    else if (publicId) options.public_id = publicId;

    for (const key of Object.keys(rest)) {
      const value = rest[key];
      options[key] = typeof value === 'function' ? await value(req, file) : value;
    }
    return options;
  }

  upload(file, options) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, response) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(response);
      };
      const stream = this.cloudinary.uploader.upload_stream(options, (error, response) => {
        finish(error, response);
      });
      file.stream.on('error', (error) => finish(error));
      file.stream.pipe(stream);
    });
  }
}

module.exports = { CloudinaryStorage };
