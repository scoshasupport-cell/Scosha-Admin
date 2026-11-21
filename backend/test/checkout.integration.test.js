const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

test.before(async () => {
  await h.startApp();
});

test.after(async () => {
  await h.cleanup();
  await h.stopApp();
  await h.prisma.$disconnect();
});

test('checkout happy path: order, snapshots, stock, cart and timeline are all consistent', async () => {
  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({
    variants: [
      { price: 19.99, stock: 10 },
      { price: 0.1, stock: 10 },
    ],
  });
  await h.addToCart(user.id, variants[0], 3);
  await h.addToCart(user.id, variants[1], 3);

  const preview = await h.api('/orders/preview', {
    method: 'POST',
    token,
    body: { addressId: address.id, deliveryMethod: 'standard' },
  });
  assert.equal(preview.status, 200, preview.text);
  // 19.99 × 3 = 59.97 and 0.1 × 3 = 0.3 — the float answers would be 59.970000000000006 and 0.30000000000000004
  assert.equal(preview.json.data.subtotal, 60.27);

  const res = await h.api('/orders', {
    method: 'POST',
    token,
    body: { addressId: address.id, deliveryMethod: 'standard', notes: 'leave at door' },
  });
  assert.equal(res.status, 201, res.text);
  const order = res.json.data;
  assert.match(order.orderNumber, /^SCO-\d{8}-\d{6}$/);
  assert.equal(order.status, 'pending');
  assert.equal(order.paymentMethod, 'COD');
  assert.equal(order.subtotal, 60.27);
  assert.equal(order.shippingCharge, 9);
  assert.equal(order.total, 69.27);
  assert.equal(order.items.length, 2);

  const dbOrder = await h.prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true, timeline: true },
  });
  assert.equal(Number(dbOrder.subtotal), 60.27);
  assert.equal(Number(dbOrder.total), 69.27);
  assert.equal(dbOrder.shipLine1, '1 Test Street');
  assert.equal(dbOrder.timeline.length, 1);
  const line = dbOrder.items.find((i) => i.variantId === variants[0].id);
  assert.equal(Number(line.unitPrice), 19.99);
  assert.equal(line.quantity, 3);
  assert.equal(line.sku, variants[0].sku);

  // Price snapshot: changing the variant price later must not change the order.
  await h.prisma.productVariant.update({ where: { id: variants[0].id }, data: { price: 99 } });
  const again = await h.api(`/orders/${order.id}`, { token });
  assert.equal(again.status, 200);
  assert.equal(again.json.data.items.find((i) => i.variantId === variants[0].id).unitPrice, 19.99);

  assert.equal(await h.variantStock(variants[0].id), 7);
  assert.equal(await h.variantStock(variants[1].id), 7);
  assert.deepEqual(await h.cartItemsForUser(user.id), []);

  const movements = await h.prisma.stockMovement.findMany({ where: { orderId: order.id } });
  assert.equal(movements.length, 2);
  assert.ok(movements.every((m) => m.reason === 'sale' && m.quantity === -3));

  // The order list is scoped to the owner and paginated.
  const list = await h.api('/orders?page=1&limit=5', { token });
  assert.equal(list.status, 200);
  assert.equal(list.json.data.length, 1);
  assert.equal(list.json.meta.total, 1);
});

test('double submission: two concurrent checkouts from one cart create exactly one order', async () => {
  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 25, stock: 20 }] });
  await h.addToCart(user.id, variants[0], 2);

  const body = { addressId: address.id, deliveryMethod: 'standard' };
  const [a, b] = await Promise.all([
    h.api('/orders', { method: 'POST', token, body }),
    h.api('/orders', { method: 'POST', token, body }),
  ]);

  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [201, 400], `${a.text}\n${b.text}`);
  const failed = a.status === 400 ? a : b;
  assert.equal(failed.json.code, 'CART_EMPTY');

  const orders = await h.ordersForUser(user.id);
  assert.equal(orders.length, 1);
  assert.equal(await h.variantStock(variants[0].id), 18);
  assert.deepEqual(await h.cartItemsForUser(user.id), []);
});

test('triple submission: three concurrent checkouts still create exactly one order', async () => {
  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 12.5, stock: 20 }] });
  await h.addToCart(user.id, variants[0], 1);

  const body = { addressId: address.id };
  const results = await Promise.all([
    h.api('/orders', { method: 'POST', token, body }),
    h.api('/orders', { method: 'POST', token, body }),
    h.api('/orders', { method: 'POST', token, body }),
  ]);
  const created = results.filter((r) => r.status === 201);
  assert.equal(created.length, 1, results.map((r) => r.text).join('\n'));
  assert.equal((await h.ordersForUser(user.id)).length, 1);
  assert.equal(await h.variantStock(variants[0].id), 19);
});

test('last item: stock 1, two customers buy at the same time, one wins and stock never goes negative', async () => {
  const { variants } = await h.createCatalog({ variants: [{ price: 40, stock: 1 }] });
  const alice = await h.createCustomer();
  const bob = await h.createCustomer({ email: null, phone: `+1555${Date.now().toString().slice(-7)}` });
  await h.addToCart(alice.user.id, variants[0], 1);
  await h.addToCart(bob.user.id, variants[0], 1);

  const [a, b] = await Promise.all([
    h.api('/orders', { method: 'POST', token: alice.token, body: { addressId: alice.address.id } }),
    h.api('/orders', { method: 'POST', token: bob.token, body: { addressId: bob.address.id } }),
  ]);

  assert.deepEqual([a.status, b.status].sort(), [201, 400], `${a.text}\n${b.text}`);
  const loser = a.status === 400 ? a : b;
  assert.ok(['OUT_OF_STOCK', 'INSUFFICIENT_STOCK'].includes(loser.json.code), loser.text);

  assert.equal(await h.variantStock(variants[0].id), 0);
  const total = (await h.ordersForUser(alice.user.id)).length + (await h.ordersForUser(bob.user.id)).length;
  assert.equal(total, 1);

  // The loser keeps their cart (nothing was claimed), so they can retry when restocked.
  const loserUser = a.status === 400 ? alice : bob;
  assert.equal((await h.cartItemsForUser(loserUser.user.id)).length, 1);
});

test('multi-quantity: stock 5, A wants 4 and B wants 3 — only one succeeds', async () => {
  const { variants } = await h.createCatalog({ variants: [{ price: 10, stock: 5 }] });
  const a = await h.createCustomer();
  const b = await h.createCustomer();
  await h.addToCart(a.user.id, variants[0], 4);
  await h.addToCart(b.user.id, variants[0], 3);

  const [ra, rb] = await Promise.all([
    h.api('/orders', { method: 'POST', token: a.token, body: { addressId: a.address.id } }),
    h.api('/orders', { method: 'POST', token: b.token, body: { addressId: b.address.id } }),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [201, 400], `${ra.text}\n${rb.text}`);

  const stock = await h.variantStock(variants[0].id);
  const aWon = ra.status === 201;
  assert.equal(stock, aWon ? 1 : 2);
  assert.ok(stock >= 0);
  const loser = aWon ? rb : ra;
  assert.equal(loser.json.code, 'INSUFFICIENT_STOCK');
  assert.equal(loser.json.errors.available, aWon ? 1 : 2);
});

test('ten customers race for 3 units: exactly 3 orders, stock ends at 0', async () => {
  const { variants } = await h.createCatalog({ variants: [{ price: 5, stock: 3 }] });
  const customers = [];
  for (let i = 0; i < 10; i += 1) {
    const c = await h.createCustomer();
    await h.addToCart(c.user.id, variants[0], 1);
    customers.push(c);
  }
  const results = await Promise.all(
    customers.map((c) =>
      h.api('/orders', { method: 'POST', token: c.token, body: { addressId: c.address.id } })
    )
  );
  const wins = results.filter((r) => r.status === 201).length;
  const losses = results.filter((r) => r.status === 400 && r.json.code === 'OUT_OF_STOCK').length;
  assert.equal(wins, 3, results.map((r) => `${r.status} ${r.json?.code}`).join(','));
  assert.equal(losses, 7);
  assert.equal(await h.variantStock(variants[0].id), 0);
});

test('transaction failure after stock claim rolls back order, stock and cart', async () => {
  const orderService = require('../src/services/order.service');
  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 30, stock: 4 }] });
  await h.addToCart(user.id, variants[0], 2);

  orderService.checkoutTestHooks.afterStockClaim = async () => {
    throw new Error('simulated failure after stock claim');
  };
  let res;
  try {
    res = await h.api('/orders', { method: 'POST', token, body: { addressId: address.id } });
  } finally {
    orderService.checkoutTestHooks.afterStockClaim = null;
  }

  assert.equal(res.status, 500);
  assert.equal(res.json.code, 'INTERNAL_ERROR');
  assert.equal(res.json.message, 'Internal server error');
  assert.ok(res.json.requestId);
  assert.equal(res.headers.get('x-request-id'), res.json.requestId);

  assert.equal((await h.ordersForUser(user.id)).length, 0);
  assert.equal(await h.variantStock(variants[0].id), 4);
  assert.equal((await h.cartItemsForUser(user.id)).length, 1);
  const movements = await h.prisma.stockMovement.findMany({ where: { variantId: variants[0].id } });
  assert.equal(movements.length, 0);
});

test('coupon: percentage discount is exact to the cent and usage is counted once', async () => {
  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 33.33, stock: 10 }] });
  await h.addToCart(user.id, variants[0], 1);
  const coupon = await h.createCoupon({ type: 'percentage', value: 15, usageLimit: 1 });

  const res = await h.api('/orders', {
    method: 'POST',
    token,
    body: { addressId: address.id, couponCode: coupon.code },
  });
  assert.equal(res.status, 201, res.text);
  assert.equal(res.json.data.couponDiscount, 5); // 33.33 × 15% = 4.9995 → 5.00
  assert.equal(res.json.data.total, 33.33 - 5 + 9);

  const used = await h.prisma.coupon.findUnique({ where: { id: coupon.id } });
  assert.equal(used.usedCount, 1);

  // Second use must fail because the limit is exhausted.
  await h.addToCart(user.id, variants[0], 1);
  const second = await h.api('/orders', {
    method: 'POST',
    token,
    body: { addressId: address.id, couponCode: coupon.code },
  });
  assert.equal(second.status, 400);
  assert.equal(second.json.code, 'COUPON_LIMIT_REACHED');
  // The failed attempt must not have consumed the cart or stock.
  assert.equal((await h.cartItemsForUser(user.id)).length, 1);
  assert.equal(await h.variantStock(variants[0].id), 9);
});

test('checkout failure cases return stable codes and never touch stock', async () => {
  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 20, stock: 2 }] });

  const empty = await h.api('/orders', { method: 'POST', token, body: { addressId: address.id } });
  assert.equal(empty.status, 400);
  assert.equal(empty.json.code, 'CART_EMPTY');

  await h.addToCart(user.id, variants[0], 1);
  const badAddress = await h.api('/orders', { method: 'POST', token, body: { addressId: 999999999 } });
  assert.equal(badAddress.status, 404);
  assert.equal(badAddress.json.code, 'ADDRESS_NOT_FOUND');

  const invalidBody = await h.api('/orders', { method: 'POST', token, body: { addressId: 'abc' } });
  assert.equal(invalidBody.status, 400);
  assert.equal(invalidBody.json.code, 'VALIDATION_ERROR');

  const badCoupon = await h.api('/orders', {
    method: 'POST',
    token,
    body: { addressId: address.id, couponCode: 'NOPE-NOT-REAL' },
  });
  assert.equal(badCoupon.status, 400);
  assert.equal(badCoupon.json.code, 'COUPON_INVALID');

  // Cart quantity above live stock (set directly, bypassing the cart API clamp)
  await h.prisma.cartItem.updateMany({
    where: { variantId: variants[0].id },
    data: { quantity: 5 },
  });
  const tooMany = await h.api('/orders', { method: 'POST', token, body: { addressId: address.id } });
  assert.equal(tooMany.status, 400);
  assert.equal(tooMany.json.code, 'INSUFFICIENT_STOCK');

  const malformed = await h.api('/orders', {
    method: 'POST',
    token,
    raw: true,
    body: '{"addressId":',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.code, 'MALFORMED_JSON');

  assert.equal(await h.variantStock(variants[0].id), 2);
  assert.equal((await h.ordersForUser(user.id)).length, 0);
});

test('unverified email account cannot check out; phone-only account can', async () => {
  const { variants } = await h.createCatalog({ variants: [{ price: 15, stock: 5 }] });
  const unverified = await h.createCustomer({ verified: false });
  await h.addToCart(unverified.user.id, variants[0], 1);
  const blocked = await h.api('/orders', {
    method: 'POST',
    token: unverified.token,
    body: { addressId: unverified.address.id },
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.code, 'EMAIL_NOT_VERIFIED');

  const phoneOnly = await h.createCustomer({
    email: null,
    verified: false,
    phone: `+1555${Date.now().toString().slice(-7)}`,
  });
  await h.addToCart(phoneOnly.user.id, variants[0], 1);
  const ok = await h.api('/orders', {
    method: 'POST',
    token: phoneOnly.token,
    body: { addressId: phoneOnly.address.id },
  });
  assert.equal(ok.status, 201, ok.text);
});

test('cart API rejects quantities above stock, inactive variants and bad ids', async () => {
  const { user, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({
    variants: [
      { price: 20, stock: 2 },
      { price: 20, stock: 5, status: 'inactive' },
    ],
  });

  const ok = await h.api('/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[0].id, quantity: 2 },
  });
  assert.equal(ok.status, 200, ok.text);

  const over = await h.api('/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[0].id, quantity: 1 },
  });
  assert.equal(over.status, 400, over.text);
  assert.equal(over.json.code, 'INSUFFICIENT_STOCK');

  const inactive = await h.api('/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[1].id, quantity: 1 },
  });
  assert.equal(inactive.status, 404, inactive.text);

  const bad = await h.api('/cart/items', { method: 'POST', token, body: { variantId: 'x', quantity: 0 } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, 'VALIDATION_ERROR');

  const items = await h.cartItemsForUser(user.id);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
});
