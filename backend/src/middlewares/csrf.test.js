const test = require('node:test');
const assert = require('node:assert/strict');
const { env } = require('../config/env');
const { allowedOrigin } = require('./csrf');

test('development allows loopback HTTP origins that are not on the explicit list', () => {
  const previous = env.isProd;
  env.isProd = false;
  try {
    assert.equal(allowedOrigin('http://localhost:3011'), true);
    assert.equal(allowedOrigin('http://127.0.0.1:3011'), true);
    assert.equal(allowedOrigin('http://evil.example'), false);
    assert.equal(allowedOrigin('https://localhost:3011'), false);
    assert.equal(allowedOrigin('null'), false);
  } finally {
    env.isProd = previous;
  }
});

test('production rejects a loopback origin that is not on the explicit list', () => {
  const previous = env.isProd;
  env.isProd = true;
  const origin = 'http://127.0.0.1:3999';
  try {
    assert.equal(env.corsOrigins.includes(origin), false);
    assert.equal(allowedOrigin(origin), false);
  } finally {
    env.isProd = previous;
  }
});
