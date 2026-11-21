const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const h = require('./helpers');
const { env } = require('../src/config/env');

test.before(async () => {
  await h.startApp();
});

test.after(async () => {
  await h.cleanup();
  await h.stopApp();
  await h.prisma.$disconnect();
});

async function placeOrder(customer, variant) {
  await h.addToCart(customer.user.id, variant, 1);
  const res = await h.api('/orders', {
    method: 'POST',
    token: customer.token,
    body: { addressId: customer.address.id },
  });
  assert.equal(res.status, 201, res.text);
  return res.json.data;
}

test('IDOR: customer A cannot read, list or act on customer B orders, addresses, wishlist or cart', async () => {
  const { variants, product } = await h.createCatalog({ variants: [{ price: 10, stock: 10 }] });
  const a = await h.createCustomer();
  const b = await h.createCustomer();
  const orderB = await placeOrder(b, variants[0]);

  const readOrder = await h.api(`/orders/${orderB.id}`, { token: a.token });
  assert.equal(readOrder.status, 404);
  assert.equal(readOrder.json.code, 'ORDER_NOT_FOUND');

  const listA = await h.api('/orders', { token: a.token });
  assert.equal(listA.status, 200);
  assert.equal(listA.json.data.length, 0);

  const readAddress = await h.api(`/addresses/${b.address.id}`, { token: a.token });
  assert.equal(readAddress.status, 404);
  const updateAddress = await h.api(`/addresses/${b.address.id}`, {
    method: 'PUT',
    token: a.token,
    body: { line1: 'hacked' },
  });
  assert.ok([400, 404].includes(updateAddress.status), updateAddress.text);
  const deleteAddress = await h.api(`/addresses/${b.address.id}`, { method: 'DELETE', token: a.token });
  assert.equal(deleteAddress.status, 404);
  const stillThere = await h.prisma.address.findUnique({ where: { id: b.address.id } });
  assert.equal(stillThere.line1, '1 Test Street');

  // Checking out with someone else's address id must fail.
  await h.addToCart(a.user.id, variants[0], 1);
  const foreignAddress = await h.api('/orders', {
    method: 'POST',
    token: a.token,
    body: { addressId: b.address.id },
  });
  assert.equal(foreignAddress.status, 404);
  assert.equal(foreignAddress.json.code, 'ADDRESS_NOT_FOUND');

  // Wishlist is derived from the token, never from a client-supplied user id.
  const addWish = await h.api(`/wishlist/${product.id}`, { method: 'POST', token: b.token });
  assert.ok([200, 201].includes(addWish.status), addWish.text);
  const wishA = await h.api('/wishlist', { token: a.token });
  assert.equal(wishA.status, 200);
  const idsA = (wishA.json.data?.items || wishA.json.data?.products || wishA.json.data || []).map(
    (item) => item.productId?.id ?? item.productId ?? item.id
  );
  assert.ok(!idsA.includes(product.id));

  const cartA = await h.api('/cart', { token: a.token });
  assert.equal(cartA.status, 200);
  assert.ok(cartA.json.data.items.every((i) => i.cartId !== undefined));
  const cartRowA = await h.prisma.cart.findUnique({ where: { userId: a.user.id } });
  assert.ok(cartA.json.data.items.every((i) => i.cartId === cartRowA.id));
});

test('authentication: missing, malformed, expired, wrong-type and banned tokens are rejected', async () => {
  const c = await h.createCustomer();

  const none = await h.api('/orders');
  assert.equal(none.status, 401);
  assert.equal(none.json.code, 'UNAUTHORIZED');

  const garbage = await h.api('/orders', { token: 'not-a-jwt' });
  assert.equal(garbage.status, 401);

  const wrongSecret = jwt.sign({ id: c.user.id, type: 'customer' }, 'wrong-secret-wrong-secret', {
    expiresIn: '5m',
  });
  assert.equal((await h.api('/orders', { token: wrongSecret })).status, 401);

  const expired = jwt.sign({ id: c.user.id, type: 'customer' }, env.JWT_ACCESS_SECRET, {
    expiresIn: -5,
  });
  assert.equal((await h.api('/orders', { token: expired })).status, 401);

  const adminTyped = jwt.sign({ id: c.user.id, type: 'admin' }, env.JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });
  const wrongType = await h.api('/orders', { token: adminTyped });
  assert.equal(wrongType.status, 401);

  await h.prisma.user.update({ where: { id: c.user.id }, data: { status: 'banned' } });
  const banned = await h.api('/orders', { token: c.token });
  assert.equal(banned.status, 401);
});

test('admin boundary: customer tokens and permission-less admins cannot use admin APIs', async () => {
  const c = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 10, stock: 10 }] });
  const order = await placeOrder(c, variants[0]);

  const endpoints = [
    ['GET', '/admin/orders'],
    ['GET', `/admin/orders/${order.id}`],
    ['PATCH', `/admin/orders/${order.id}/status`, { status: 'cancelled' }],
    ['GET', '/admin/products'],
    ['GET', '/admin/customers'],
    ['GET', '/admin/dashboard/stats'],
    ['GET', '/admin/admins'],
    ['GET', '/admin/roles'],
    ['GET', '/admin/settings'],
  ];

  for (const [method, pathname, body] of endpoints) {
    const asCustomer = await h.api(pathname, { method, token: c.token, body });
    assert.equal(asCustomer.status, 401, `${method} ${pathname} as customer → ${asCustomer.status}`);
    const anonymous = await h.api(pathname, { method, body });
    assert.equal(anonymous.status, 401, `${method} ${pathname} anonymous → ${anonymous.status}`);
  }

  // A customer token with a forged role claim is still a customer token.
  const forged = h.customerToken(c.user, { role: 'Super Admin' });
  assert.equal((await h.api('/admin/orders', { token: forged })).status, 401);

  const noPerms = await h.createAdmin({ permissions: [] });
  const denied = await h.api('/admin/orders', { token: noPerms.token });
  assert.equal(denied.status, 403);
  assert.equal(denied.json.code, 'FORBIDDEN');
  const deniedStatus = await h.api(`/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    token: noPerms.token,
    body: { status: 'cancelled' },
  });
  assert.equal(deniedStatus.status, 403);

  const readOnly = await h.createAdmin({ permissions: [['orders', 'read']] });
  const canRead = await h.api(`/admin/orders/${order.id}`, { token: readOnly.token });
  assert.equal(canRead.status, 200, canRead.text);
  const cannotWrite = await h.api(`/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    token: readOnly.token,
    body: { status: 'cancelled' },
  });
  assert.equal(cannotWrite.status, 403);

  const stillPending = await h.prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(stillPending.status, 'pending');
  assert.equal(await h.variantStock(variants[0].id), 9);
});

test('admin order lifecycle: illegal transitions are refused, cancel restores stock exactly once', async () => {
  const c = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 10, stock: 10 }] });
  const order = await placeOrder(c, variants[0]);
  const admin = await h.createAdmin({ permissions: [['orders', 'read'], ['orders', 'update']] });

  const backwards = await h.api(`/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    token: admin.token,
    body: { status: 'delivered' },
  });
  assert.equal(backwards.status, 400, backwards.text);
  assert.equal(backwards.json.code, 'INVALID_STATUS_TRANSITION');

  const refundPending = await h.api(`/admin/orders/${order.id}/refund`, {
    method: 'POST',
    token: admin.token,
    body: {},
  });
  assert.equal(refundPending.status, 400, refundPending.text);
  assert.equal(refundPending.json.code, 'INVALID_STATUS_TRANSITION');

  const [c1, c2] = await Promise.all([
    h.api(`/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      token: admin.token,
      body: { status: 'cancelled' },
    }),
    h.api(`/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      token: admin.token,
      body: { status: 'cancelled' },
    }),
  ]);
  assert.deepEqual([c1.status, c2.status].sort(), [200, 400], `${c1.text}\n${c2.text}`);
  assert.equal(await h.variantStock(variants[0].id), 10);

  const afterCancel = await h.api(`/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    token: admin.token,
    body: { status: 'confirmed' },
  });
  assert.equal(afterCancel.status, 400);

  const movements = await h.prisma.stockMovement.findMany({ where: { variantId: variants[0].id } });
  assert.deepEqual(
    movements.map((m) => m.quantity).sort((x, y) => x - y),
    [-1, 1]
  );
});

test('dashboard: aggregates run in MySQL and reflect a real order', async () => {
  const c = await h.createCustomer();
  const { variants, product } = await h.createCatalog({ variants: [{ price: 12.34, stock: 10 }] });
  await h.addToCart(c.user.id, variants[0], 2);
  const placed = await h.api('/orders', {
    method: 'POST',
    token: c.token,
    body: { addressId: c.address.id },
  });
  assert.equal(placed.status, 201, placed.text);

  const admin = await h.createAdmin({
    permissions: [
      ['reports', 'read'],
      ['orders', 'read'],
      ['products', 'read'],
      ['inventory', 'read'],
      ['customers', 'read'],
    ],
  });

  const stats = await h.api('/admin/dashboard/stats', { token: admin.token });
  assert.equal(stats.status, 200, stats.text);
  for (const key of ['revenue', 'ordersCount', 'customers', 'products', 'lowStockCount']) {
    assert.equal(typeof stats.json.data[key], 'number', key);
  }
  assert.ok(stats.json.data.ordersCount >= 1);

  const top = await h.api('/admin/dashboard/top-products?limit=50', { token: admin.token });
  assert.equal(top.status, 200, top.text);
  assert.ok(top.json.data.length <= 50);
  const mine = top.json.data.find((row) => row.id === product.id);
  assert.ok(mine, 'placed order product should appear in top products');
  assert.equal(mine.quantitySold, 2);
  assert.equal(mine.revenue, 24.68);

  const chart = await h.api('/admin/dashboard/charts/orders?period=7d', { token: admin.token });
  assert.equal(chart.status, 200, chart.text);
  assert.equal(chart.json.data.series.length, 7);
  assert.ok(chart.json.data.series.every((p) => typeof p.orders === 'number'));

  const low = await h.api('/admin/dashboard/low-stock?limit=5', { token: admin.token });
  assert.equal(low.status, 200, low.text);
  assert.ok(low.json.data.length <= 5);
});

test('deleting a customer with orders anonymizes the account and keeps the orders', async () => {
  const c = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 10, stock: 10 }] });
  const order = await placeOrder(c, variants[0]);
  const admin = await h.createAdmin({ permissions: [['customers', 'read'], ['customers', 'delete']] });

  const res = await h.api(`/admin/customers/${c.user.id}`, { method: 'DELETE', token: admin.token });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.json.data.mode, 'anonymized');

  const user = await h.prisma.user.findUnique({ where: { id: c.user.id } });
  assert.equal(user.status, 'deleted');
  assert.equal(user.email, null);
  assert.equal(user.phone, null);
  assert.ok(user.name.startsWith('Deleted customer'));

  const kept = await h.prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
  assert.ok(kept);
  assert.equal(kept.items.length, 1);
  assert.equal(kept.shipEmail, null);
  assert.equal(await h.prisma.address.count({ where: { userId: c.user.id } }), 0);

  // The old token is dead and the account is hidden from the default customer list.
  assert.equal((await h.api('/orders', { token: c.token })).status, 401);
  const list = await h.api(`/admin/customers?q=${encodeURIComponent(h.RUN_ID)}`, { token: admin.token });
  assert.equal(list.status, 200);
  assert.ok(!list.json.data.some((row) => row.id === c.user.id));

  // A customer with no orders is removed outright.
  const fresh = await h.createCustomer();
  const hard = await h.api(`/admin/customers/${fresh.user.id}`, { method: 'DELETE', token: admin.token });
  assert.equal(hard.status, 200, hard.text);
  assert.equal(hard.json.data.mode, 'deleted');
  assert.equal(await h.prisma.user.findUnique({ where: { id: fresh.user.id } }), null);
});

test('mass assignment: registration ignores role, isVip, isEmailVerified and status', async () => {
  const email = `${h.RUN_ID}-mass@example.test`;
  const res = await h.api('/auth/register', {
    method: 'POST',
    body: {
      name: 'Mass Assign',
      email,
      password: 'Passw0rd!test',
      roleId: 1,
      role: 'Super Admin',
      isVip: true,
      isEmailVerified: true,
      status: 'active',
      freeDeliveryCredits: 99,
    },
  });
  assert.ok([200, 201].includes(res.status), res.text);
  const user = await h.prisma.user.findUnique({ where: { email }, include: { role: true } });
  assert.ok(user);
  assert.equal(user.isVip, false);
  assert.equal(user.isEmailVerified, false);
  assert.equal(user.freeDeliveryCredits, 0);
  assert.notEqual(user.role?.name, 'Super Admin');
  await h.prisma.user.delete({ where: { id: user.id } }).catch(() => {});
});

test('error responses carry a code and the request id, and echo a safe X-Request-Id', async () => {
  const res = await h.api('/orders/abc', { headers: { 'X-Request-Id': 'trace-123' } });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('x-request-id'), 'trace-123');
  assert.equal(res.json.requestId, 'trace-123');
  assert.equal(res.json.code, 'UNAUTHORIZED');

  const unsafe = await h.api('/health/live', { headers: { 'X-Request-Id': '<script>alert(1)</script>' } });
  assert.notEqual(unsafe.headers.get('x-request-id'), '<script>alert(1)</script>');

  const missing = await h.api('/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.json.code, 'NOT_FOUND');
});

test('health: live and ready report the real database state', async () => {
  const live = await h.api('/health/live');
  assert.equal(live.status, 200);
  const ready = await h.api('/health/ready');
  assert.equal(ready.status, 200, ready.text);
  assert.equal(ready.json.data.database.status, 'connected');
  const full = await h.api('/health');
  assert.equal(full.status, 200);
});
