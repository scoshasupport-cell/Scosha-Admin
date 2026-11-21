const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { env } = require('../src/config/env');

const allowed = env.corsOrigins[0];
const evil = 'https://evil.example';

test.before(async () => {
  await h.startApp();
  assert.ok(allowed, 'CORS_ORIGINS must contain the storefront or admin origin');
  assert.notEqual(allowed, evil);
});

test.after(async () => {
  await h.cleanup();
  await h.stopApp();
  await h.prisma.$disconnect();
});

function codeOf(res) {
  return res.json && res.json.code;
}

test('public reads ignore Origin, and bearer clients are not treated as cookie CSRF', async () => {
  const catalog = await h.api('/products?limit=1', { headers: { Origin: evil } });
  assert.equal(catalog.status, 200, catalog.text);

  const health = await h.api('/health/live', { headers: { Origin: evil } });
  assert.equal(health.status, 200, health.text);

  const { token } = await h.createCustomer();
  const logout = await h.api('/auth/logout', {
    method: 'POST',
    token,
    headers: { Origin: evil },
  });
  assert.equal(logout.status, 200, logout.text);
  assert.notEqual(codeOf(logout), 'CSRF_REJECTED');
});

test('cookie-authenticated unsafe requests require an allowlisted Origin', async () => {
  const blocked = await h.api('/auth/logout', {
    method: 'POST',
    headers: { Origin: evil, Cookie: 'accessToken=not-a-jwt' },
  });
  assert.equal(blocked.status, 403, blocked.text);
  assert.equal(codeOf(blocked), 'CSRF_REJECTED');

  const nullOrigin = await h.api('/auth/refresh', {
    method: 'POST',
    headers: { Origin: 'null', Cookie: 'refreshToken=not-a-jwt' },
    body: {},
  });
  assert.equal(nullOrigin.status, 403, nullOrigin.text);
  assert.equal(codeOf(nullOrigin), 'CSRF_REJECTED');

  const missingOrigin = await h.api('/auth/logout', {
    method: 'POST',
    headers: { Cookie: 'accessToken=not-a-jwt' },
  });
  assert.equal(missingOrigin.status, 403, missingOrigin.text);
  assert.equal(codeOf(missingOrigin), 'CSRF_REJECTED');

  const badReferer = await h.api('/admin/auth/logout', {
    method: 'POST',
    headers: {
      Referer: 'https://evil.example/admin',
      Cookie: 'adminAccessToken=not-a-jwt',
    },
  });
  assert.equal(badReferer.status, 403, badReferer.text);
  assert.equal(codeOf(badReferer), 'CSRF_REJECTED');

  const guestCart = await h.api('/cart/items', {
    method: 'POST',
    headers: { Origin: evil, Cookie: `${env.GUEST_SESSION_COOKIE}=11111111-1111-4111-8111-111111111111` },
    body: { variantId: 1, quantity: 1 },
  });
  assert.equal(guestCart.status, 403, guestCart.text);
  assert.equal(codeOf(guestCart), 'CSRF_REJECTED');

  const allowedLogout = await h.api('/auth/logout', {
    method: 'POST',
    headers: { Origin: allowed, Cookie: 'accessToken=not-a-jwt' },
  });
  assert.equal(allowedLogout.status, 401, allowedLogout.text);
  assert.notEqual(codeOf(allowedLogout), 'CSRF_REJECTED');

  const allowedReferer = await h.api('/auth/refresh', {
    method: 'POST',
    headers: { Referer: `${allowed}/account`, Cookie: 'refreshToken=not-a-jwt' },
    body: {},
  });
  assert.notEqual(allowedReferer.status, 403, allowedReferer.text);
  assert.notEqual(codeOf(allowedReferer), 'CSRF_REJECTED');
});

test('non-browser clients without a session cookie can still call unsafe public routes', async () => {
  const login = await h.api('/auth/login', {
    method: 'POST',
    body: { email: 'nobody@example.test', password: 'Passw0rd!test' },
  });
  assert.notEqual(login.status, 403, login.text);
  assert.notEqual(codeOf(login), 'CSRF_REJECTED');

  const fromBrowser = await h.api('/auth/login', {
    method: 'POST',
    headers: { Origin: evil },
    body: { email: 'nobody@example.test', password: 'Passw0rd!test' },
  });
  assert.equal(fromBrowser.status, 403, fromBrowser.text);
  assert.equal(codeOf(fromBrowser), 'CSRF_REJECTED');

  const fromStore = await h.api('/auth/login', {
    method: 'POST',
    headers: { Origin: allowed },
    body: { email: 'nobody@example.test', password: 'Passw0rd!test' },
  });
  assert.notEqual(fromStore.status, 403, fromStore.text);
});
