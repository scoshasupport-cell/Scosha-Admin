const test = require('node:test');
const assert = require('node:assert/strict');
const { ApiError } = require('../utils/ApiError');
const { fileFilter, sanitizePublicId } = require('./upload');

test('public ids drop characters outside the safe set', () => {
  const id = sanitizePublicId('coat&winter?.png');
  assert.match(id, /^\d+-coat-winter-$/);
  assert.equal(id.includes('&'), false);
  assert.equal(id.includes('?'), false);
});

test('file filter rejects unsupported MIME types', () => {
  fileFilter({}, { mimetype: 'text/html' }, (error, accepted) => {
    assert.equal(accepted, false);
    assert.ok(error instanceof ApiError);
    assert.match(error.message, /Unsupported file type/);
  });
});

test('file filter accepts the image allowlist', () => {
  for (const mimetype of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
    fileFilter({}, { mimetype }, (error, accepted) => {
      assert.equal(error, null);
      assert.equal(accepted, true);
    });
  }
});
