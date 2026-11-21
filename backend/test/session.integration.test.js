const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const h = require('./helpers');
const { env } = require('../src/config/env');
const { hashToken } = require('../src/utils/tokens');

function cookieAuth(name, value) {
  return {
    Cookie: `${name}=${encodeURIComponent(value)}`,
    Origin: env.corsOrigins[0],
  };
}

test.before(async () => {
  await h.startApp();
});

test.after(async () => {
  await h.cleanup();
  await h.stopApp();
  await h.prisma.$disconnect();
});

test('a valid customer session can read /auth/me, and two concurrent reads both succeed', async () => {
  const { token } = await h.createCustomer();
  const [a, b] = await Promise.all([
    h.api('/auth/me', { token }),
    h.api('/auth/me', { token }),
  ]);
  assert.equal(a.status, 200, a.text);
  assert.equal(b.status, 200, b.text);
  assert.equal(a.json.data.id, b.json.data.id);
});

test('logout, password change, and password reset reject the previous access token', async () => {
  const loggedOut = await h.createCustomer();
  const out = await h.api('/auth/logout', { method: 'POST', token: loggedOut.token });
  assert.equal(out.status, 200, out.text);
  const afterLogout = await h.api('/auth/me', { token: loggedOut.token });
  assert.equal(afterLogout.status, 401, afterLogout.text);

  const changed = await h.createCustomer();
  const change = await h.api('/auth/change-password', {
    method: 'POST',
    token: changed.token,
    body: { currentPassword: 'Passw0rd!test', newPassword: 'Passw0rd!next' },
  });
  assert.equal(change.status, 200, change.text);
  assert.equal((await h.api('/auth/me', { token: changed.token })).status, 401);

  const resetUser = await h.createCustomer();
  const resetToken = 'reset-token-0123456789';
  await h.prisma.user.update({
    where: { id: resetUser.user.id },
    data: {
      resetPasswordToken: await hashToken(resetToken),
      resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const reset = await h.api('/auth/reset-password', {
    method: 'POST',
    body: { email: resetUser.user.email, token: resetToken, password: 'Passw0rd!reset' },
  });
  assert.equal(reset.status, 200, reset.text);
  assert.equal((await h.api('/auth/me', { token: resetUser.token })).status, 401);
});

test('refresh keeps the current access token valid until logout', async () => {
  const { user } = await h.createCustomer();
  const login = await h.api('/auth/login', {
    method: 'POST',
    body: { email: user.email, password: 'Passw0rd!test' },
  });
  assert.equal(login.status, 200, login.text);
  assert.equal(login.json.data.accessToken, undefined);
  assert.equal(login.json.data.refreshToken, undefined);
  const access = h.cookieValue(login, 'accessToken');
  const refreshToken = h.cookieValue(login, 'refreshToken');
  assert.ok(access);
  assert.ok(refreshToken);
  assert.match(login.headers.getSetCookie().join('\n'), /HttpOnly/i);
  const refresh = await h.api('/auth/refresh', {
    method: 'POST',
    headers: cookieAuth('refreshToken', refreshToken),
    body: {},
  });
  assert.equal(refresh.status, 200, refresh.text);
  assert.equal(refresh.json.data.accessToken, undefined);
  assert.equal(refresh.json.data.refreshToken, undefined);
  const rotated = h.cookieValue(refresh, 'accessToken');
  assert.ok(rotated);
  assert.equal((await h.api('/auth/me', { token: access })).status, 200);
  assert.equal((await h.api('/auth/me', { token: rotated })).status, 200);

  const expired = jwt.sign({ id: user.id, type: 'customer', tv: 0 }, env.JWT_ACCESS_SECRET, {
    expiresIn: -5,
  });
  assert.equal((await h.api('/auth/me', { token: expired })).status, 401);

  await h.api('/auth/logout', { method: 'POST', token: rotated });
  assert.equal((await h.api('/auth/me', { token: access })).status, 401);
  assert.equal((await h.api('/auth/me', { token: rotated })).status, 401);

  const replay = await h.api('/auth/refresh', {
    method: 'POST',
    headers: cookieAuth('refreshToken', refreshToken),
    body: {},
  });
  assert.equal(replay.status, 401, replay.text);
});

test('two concurrent refreshes rotate the same refresh token only once', async () => {
  const { user } = await h.createCustomer();
  const login = await h.api('/auth/login', {
    method: 'POST',
    body: { email: user.email, password: 'Passw0rd!test' },
  });
  assert.equal(login.status, 200, login.text);
  const refreshToken = h.cookieValue(login, 'refreshToken');
  assert.ok(refreshToken);
  const cookie = cookieAuth('refreshToken', refreshToken);
  const [first, second] = await Promise.all([
    h.api('/auth/refresh', { method: 'POST', headers: cookie, body: {} }),
    h.api('/auth/refresh', { method: 'POST', headers: cookie, body: {} }),
  ]);
  const succeeded = [first, second].filter((res) => res.status === 200);
  const failed = [first, second].filter((res) => res.status === 401);
  assert.equal(succeeded.length, 1, `${first.status} ${first.text} | ${second.status} ${second.text}`);
  assert.equal(failed.length, 1);
  const replay = await h.api('/auth/refresh', { method: 'POST', headers: cookie, body: {} });
  assert.equal(replay.status, 401, replay.text);
  const winner = h.cookieValue(succeeded[0], 'refreshToken');
  assert.ok(winner);
  assert.notEqual(winner, refreshToken);
  const again = await h.api('/auth/refresh', {
    method: 'POST',
    headers: cookieAuth('refreshToken', winner),
    body: {},
  });
  assert.equal(again.status, 200, again.text);
});

test('admin logout rejects the previous admin access token', async () => {
  const admin = await h.createAdmin();
  const login = await h.api('/admin/auth/login', {
    method: 'POST',
    body: { email: admin.admin.email, password: 'Passw0rd!test' },
  });
  assert.equal(login.status, 200, login.text);
  assert.equal(login.json.data.accessToken, undefined);
  const access = h.cookieValue(login, 'adminAccessToken');
  assert.ok(access);
  const out = await h.api('/admin/auth/logout', { method: 'POST', token: access });
  assert.equal(out.status, 200, out.text);
  assert.equal((await h.api('/admin/auth/me', { token: access })).status, 401);
});

test('admin password change rejects the previous admin access token', async () => {
  const admin = await h.createAdmin({ permissions: [['orders', 'read']] });
  const login = await h.api('/admin/auth/login', {
    method: 'POST',
    body: { email: admin.admin.email, password: 'Passw0rd!test' },
  });
  assert.equal(login.status, 200, login.text);
  assert.equal(login.json.data.refreshToken, undefined);
  const access = h.cookieValue(login, 'adminAccessToken');
  assert.ok(access);
  assert.equal((await h.api('/admin/auth/me', { token: access })).status, 200);

  const me = await h.api('/admin/auth/me', { token: access });
  assert.equal(me.status, 200, me.text);

  const change = await h.api('/admin/auth/change-password', {
    method: 'POST',
    token: access,
    body: { currentPassword: 'Passw0rd!test', newPassword: 'Passw0rd!admin' },
  });
  assert.equal(change.status, 200, change.text);
  assert.equal((await h.api('/admin/auth/me', { token: access })).status, 401);
});

test('admin password reset and ban reject the previous admin access and refresh tokens', async () => {
  const actor = await h.createAdmin({ permissions: [['admins', 'update']] });
  const target = await h.createAdmin();
  const login = await h.api('/admin/auth/login', {
    method: 'POST',
    body: { email: target.admin.email, password: 'Passw0rd!test' },
  });
  assert.equal(login.status, 200, login.text);
  assert.equal(login.json.data.accessToken, undefined);
  assert.equal(login.json.data.refreshToken, undefined);
  const access = h.cookieValue(login, 'adminAccessToken');
  const refreshToken = h.cookieValue(login, 'adminRefreshToken');
  assert.ok(access);
  assert.ok(refreshToken);

  const reset = await h.api(`/admin/admins/${target.admin.id}`, {
    method: 'PATCH',
    token: actor.token,
    body: { password: 'Passw0rd!set' },
  });
  assert.equal(reset.status, 200, reset.text);
  assert.equal((await h.api('/admin/auth/me', { token: access })).status, 401);
  const refresh = await h.api('/admin/auth/refresh', {
    method: 'POST',
    headers: cookieAuth('adminRefreshToken', refreshToken),
    body: {},
  });
  assert.equal(refresh.status, 401, refresh.text);

  const banned = await h.createAdmin();
  const bannedLogin = await h.api('/admin/auth/login', {
    method: 'POST',
    body: { email: banned.admin.email, password: 'Passw0rd!test' },
  });
  assert.equal(bannedLogin.status, 200, bannedLogin.text);
  const bannedAccess = h.cookieValue(bannedLogin, 'adminAccessToken');
  assert.ok(bannedAccess);
  const ban = await h.api(`/admin/admins/${banned.admin.id}`, {
    method: 'PATCH',
    token: actor.token,
    body: { status: 'banned' },
  });
  assert.equal(ban.status, 200, ban.text);
  assert.equal((await h.api('/admin/auth/me', { token: bannedAccess })).status, 401);
  const unban = await h.api(`/admin/admins/${banned.admin.id}`, {
    method: 'PATCH',
    token: actor.token,
    body: { status: 'active' },
  });
  assert.equal(unban.status, 200, unban.text);
  assert.equal((await h.api('/admin/auth/me', { token: bannedAccess })).status, 401);
});

test('optional auth: anonymous catalog works; banned, deleted, and revoked tokens cannot change the account cart', async () => {
  const anon = await h.api('/products?limit=1');
  assert.equal(anon.status, 200, anon.text);

  const { user, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 10, stock: 5 }] });
  const added = await h.api('/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[0].id, quantity: 1 },
  });
  assert.equal(added.status, 200, added.text);

  const catalog = await h.api('/products?limit=1', { token });
  assert.equal(catalog.status, 200, catalog.text);

  const expired = jwt.sign({ id: user.id, type: 'customer', tv: 0 }, env.JWT_ACCESS_SECRET, {
    expiresIn: -5,
  });
  assert.equal((await h.api('/products?limit=1', { token: expired })).status, 200);
  assert.equal((await h.api('/products?limit=1', { token: 'not-a-jwt' })).status, 200);

  const admin = await h.createAdmin();
  assert.equal((await h.api('/products?limit=1', { token: admin.token })).status, 200);
  assert.equal((await h.api('/orders', { token: admin.token })).status, 401);

  await h.prisma.user.update({ where: { id: user.id }, data: { status: 'banned' } });
  const bannedAdd = await h.api('/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[0].id, quantity: 1 },
  });
  assert.equal(bannedAdd.status, 200, bannedAdd.text);
  const bannedCart = await h.cartItemsForUser(user.id);
  assert.equal(bannedCart.length, 1);
  assert.equal(bannedCart[0].quantity, 1);

  await h.prisma.user.update({ where: { id: user.id }, data: { status: 'active' } });
  await h.api('/auth/logout', { method: 'POST', token });
  const revokedAdd = await h.api('/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[0].id, quantity: 1 },
  });
  assert.equal(revokedAdd.status, 200, revokedAdd.text);
  const revokedCart = await h.cartItemsForUser(user.id);
  assert.equal(revokedCart.length, 1);
  assert.equal(revokedCart[0].quantity, 1);

  await h.prisma.user.update({ where: { id: user.id }, data: { status: 'deleted' } });
  const fresh = h.customerToken(user);
  const deletedAdd = await h.api('/cart/items', {
    method: 'POST',
    token: fresh,
    body: { variantId: variants[0].id, quantity: 1 },
  });
  assert.equal(deletedAdd.status, 200, deletedAdd.text);
  const deletedCart = await h.cartItemsForUser(user.id);
  assert.equal(deletedCart.length, 1);
});
