/**
 * Two real Node API processes, one MySQL. Proves JWT/cart/checkout are not process-local,
 * and that in-memory rate-limit counters are.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');
const h = require('./helpers');

const ROOT = path.resolve(__dirname, '..');

function call(baseUrl, pathname, { method = 'GET', token, body } = {}) {
  return fetch(`${baseUrl}/api/v1${pathname}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async (res) => {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text };
  });
}

async function waitReady(child, timeoutMs = 60000) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(
        `API at ${child.baseUrl} exited ${child.exitCode} before ready. Logs:\n${child.collectedLogs.join('')}`
      );
    }
    try {
      const res = await call(child.baseUrl, '/health/ready');
      if (res.status === 200) return;
      last = `${res.status} ${res.text}`;
    } catch (error) {
      last = error.cause?.code || error.message;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`API at ${child.baseUrl} never became ready: ${last}\n${child.collectedLogs.join('')}`);
}

function spawnApi(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      EMAIL_ENABLED: '0',
      LOG_LEVEL: 'info',
      RATE_LIMIT_MAX: '1000000',
      AUTH_RATE_LIMIT_MAX: '100000',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const logs = [];
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));
  child.exitPromise = new Promise((resolve) => child.once('exit', resolve));
  child.collectedLogs = logs;
  child.baseUrl = `http://127.0.0.1:${port}`;
  return child;
}

async function stopApi(child, signal = 'SIGTERM') {
  if (!child || child.exitCode !== null) return child?.exitCode;
  child.kill(signal);
  const exitCode = await Promise.race([
    child.exitPromise,
    new Promise((resolve) => setTimeout(() => resolve('timeout'), 8000)),
  ]);
  if (exitCode === 'timeout') {
    child.kill('SIGKILL');
    await child.exitPromise;
    return 'killed';
  }
  return exitCode;
}

test('two API processes share JWT, cart and last-unit checkout; rate limits do not share', async (t) => {
  const a = spawnApi(18001);
  t.after(async () => {
    await stopApi(a);
    await h.cleanup();
    await h.prisma.$disconnect();
  });
  await waitReady(a);

  const b = spawnApi(18002);
  t.after(async () => {
    await stopApi(b);
  });
  await waitReady(b);

  const { user, address, token } = await h.createCustomer();
  const { variants } = await h.createCatalog({ variants: [{ price: 19.99, stock: 10 }] });

  const meOnB = await call(b.baseUrl, '/auth/me', { token });
  assert.equal(meOnB.status, 200, meOnB.text);
  assert.equal(String(meOnB.json.data.id), String(user.id));

  const addOnA = await call(a.baseUrl, '/cart/items', {
    method: 'POST',
    token,
    body: { variantId: variants[0].id, quantity: 1 },
  });
  assert.equal(addOnA.status, 200, addOnA.text);

  const cartOnB = await call(b.baseUrl, '/cart', { token });
  assert.equal(cartOnB.status, 200, cartOnB.text);
  assert.equal(cartOnB.json.data.items.length, 1);
  const cartItem = cartOnB.json.data.items[0];
  assert.equal(String(cartItem.itemId || cartItem.variantId?.id), String(variants[0].id));

  const alice = await h.createCustomer();
  const bob = await h.createCustomer({ email: null, phone: `+1555${Date.now().toString().slice(-7)}` });
  const { variants: last } = await h.createCatalog({ variants: [{ price: 40, stock: 1 }] });
  await h.addToCart(alice.user.id, last[0], 1);
  await h.addToCart(bob.user.id, last[0], 1);

  const [ra, rb] = await Promise.all([
    call(a.baseUrl, '/orders', {
      method: 'POST',
      token: alice.token,
      body: { addressId: alice.address.id },
    }),
    call(b.baseUrl, '/orders', {
      method: 'POST',
      token: bob.token,
      body: { addressId: bob.address.id },
    }),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [201, 400], `${ra.text}\n${rb.text}`);
  const loser = ra.status === 400 ? ra : rb;
  assert.ok(['OUT_OF_STOCK', 'INSUFFICIENT_STOCK'].includes(loser.json.code), loser.text);
  assert.equal(await h.variantStock(last[0].id), 0);
  const total =
    (await h.ordersForUser(alice.user.id)).length + (await h.ordersForUser(bob.user.id)).length;
  assert.equal(total, 1);

  const preview = await call(b.baseUrl, '/orders/preview', {
    method: 'POST',
    token,
    body: { addressId: address.id, deliveryMethod: 'standard' },
  });
  assert.equal(preview.status, 200, preview.text);

  const limA = spawnApi(18003, { RATE_LIMIT_MAX: '8', RATE_LIMIT_WINDOW_MS: '60000' });
  const limB = spawnApi(18004, { RATE_LIMIT_MAX: '8', RATE_LIMIT_WINDOW_MS: '60000' });
  t.after(async () => {
    await stopApi(limA);
    await stopApi(limB);
  });
  await waitReady(limA);
  await waitReady(limB);

  const statusesA = [];
  for (let i = 0; i < 12; i += 1) {
    statusesA.push((await call(limA.baseUrl, '/products?limit=1')).status);
  }
  assert.ok(statusesA.includes(429), `instance A never 429d: ${statusesA.join(',')}`);
  const onB = await call(limB.baseUrl, '/products?limit=1');
  assert.equal(onB.status, 200, `rate-limit leaked across processes: ${onB.status} ${onB.text}`);
});
