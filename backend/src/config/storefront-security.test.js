const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '../../../next.config.mjs'), 'utf8');

test('storefront sends a report-only content security policy', () => {
  assert.match(source, /Content-Security-Policy-Report-Only/);
  assert.match(source, /https:\/\/accounts\.google\.com/);
  assert.match(source, /https:\/\/res\.cloudinary\.com/);
  assert.doesNotMatch(source, /key:\s*"Content-Security-Policy"/);
});

test('next image config does not opt in to remote svg', () => {
  assert.doesNotMatch(source, /dangerouslyAllowSVG:\s*true/);
});
