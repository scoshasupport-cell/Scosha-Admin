/**
 * Integration test harness. Writes only to the scosha_test schema named by
 * TEST_DATABASE_URL. It aborts before opening Prisma when that URL is missing
 * or points at any other database, including the development schema.
 */
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { assertIsolatedTestDatabase, databaseName } = require('../src/config/testDatabase');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'warn';
process.env.EMAIL_ENABLED = '0';
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '100000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '1000000';
if (process.env.SCOSHA_BENCH === '1') {
  const benchName = databaseName(process.env.DATABASE_URL);
  if (!benchName || benchName === 'scosha') {
    console.error('Bench refused: DATABASE_URL is missing or points at the development schema.');
    process.exit(1);
  }
} else {
  try {
    process.env.DATABASE_URL = assertIsolatedTestDatabase();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
process.chdir(path.resolve(__dirname, '..'));

const bcrypt = require('bcryptjs');
const { prisma } = require('../src/config/prisma');
const { generateAccessToken } = require('../src/utils/tokens');

const RUN_ID = `t${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;

const created = {
  userIds: [],
  brandIds: [],
  categoryIds: [],
  productIds: [],
  couponIds: [],
  adminIds: [],
  roleIds: [],
};

let server = null;
let baseUrl = null;

async function startApp() {
  if (server) return baseUrl;
  const { assertConnectedTestDatabase } = require('../src/config/testDatabase');
  if (process.env.SCOSHA_BENCH === '1') {
    const rows = await prisma.$queryRawUnsafe('SELECT DATABASE() AS name');
    const name = rows?.[0]?.name || '';
    if (!name || name === 'scosha') {
      throw new Error(`Bench connected to "${name || 'unknown'}". Refusing to write the development schema.`);
    }
  } else {
    await assertConnectedTestDatabase(prisma);
  }
  const app = require('../src/app');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
}

async function stopApp() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
}

async function api(pathname, { method = 'GET', token, body, headers = {}, raw = false } = {}) {
  const started = process.hrtime.bigint();
  const res = await fetch(`${baseUrl}/api/v1${pathname}`, {
    method,
    headers: {
      ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers, durationMs };
}

function customerToken(user, overrides = {}) {
  return generateAccessToken({ id: user.id, email: user.email, role: 'Customer', ...overrides }, 'customer');
}

async function createCustomer({ email, phone, verified = true, name } = {}) {
  const suffix = crypto.randomBytes(3).toString('hex');
  const role = await prisma.role.findUnique({ where: { name: 'Customer' } });
  const user = await prisma.user.create({
    data: {
      name: name || `Test ${RUN_ID} ${suffix}`,
      email: email === null ? null : email || `${RUN_ID}-${suffix}@example.test`,
      phone: phone || null,
      passwordHash: await bcrypt.hash('Passw0rd!test', 4),
      isEmailVerified: verified,
      roleId: role?.id || null,
    },
  });
  created.userIds.push(user.id);
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      name: user.name,
      phone: phone || '+15550000000',
      email: user.email,
      line1: '1 Test Street',
      city: 'Testville',
      state: 'CA',
      zip: '90001',
      country: 'US',
      isDefault: true,
    },
  });
  return { user, address, token: customerToken(user) };
}

async function createCatalog({ variants = [{ price: 19.99, stock: 10 }], productStatus = 'active' } = {}) {
  const suffix = crypto.randomBytes(3).toString('hex');
  const brand = await prisma.brand.create({
    data: { name: `Brand ${RUN_ID}`, slug: `brand-${RUN_ID}-${suffix}` },
  });
  created.brandIds.push(brand.id);
  const category = await prisma.category.create({
    data: { name: `Category ${RUN_ID}`, slug: `category-${RUN_ID}-${suffix}` },
  });
  created.categoryIds.push(category.id);
  const product = await prisma.product.create({
    data: {
      name: `Test Product ${RUN_ID} ${suffix}`,
      slug: `test-product-${RUN_ID}-${suffix}`,
      brandId: brand.id,
      categoryId: category.id,
      basePrice: variants[0].price,
      status: productStatus,
      images: [],
      variants: {
        create: variants.map((v, idx) => ({
          colorName: v.colorName || 'Black',
          colorHex: '#000000',
          size: v.size || ['S', 'M', 'L', 'XL'][idx % 4],
          sku: `${RUN_ID}-${suffix}-${idx}`.toUpperCase(),
          price: v.price,
          comparePrice: v.comparePrice ?? null,
          stock: v.stock,
          status: v.status || 'active',
          images: [],
        })),
      },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  return { brand, category, product, variants: product.variants };
}

async function createCoupon(data) {
  const coupon = await prisma.coupon.create({
    data: { code: `${RUN_ID}-${crypto.randomBytes(2).toString('hex')}`.toUpperCase(), ...data },
  });
  created.couponIds.push(coupon.id);
  return coupon;
}

async function addToCart(userId, variant, quantity) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    update: { quantity },
    create: {
      cartId: cart.id,
      variantId: variant.id,
      productId: variant.productId,
      quantity,
      color: variant.colorName,
      size: variant.size,
    },
  });
  return cart;
}

async function createAdmin({ permissions = [] } = {}) {
  const suffix = crypto.randomBytes(3).toString('hex');
  const role = await prisma.role.create({
    data: { name: `Role ${RUN_ID} ${suffix}`, isSystem: false },
  });
  created.roleIds.push(role.id);
  for (const [moduleName, action] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module: moduleName, action } },
      update: {},
      create: { module: moduleName, action },
    });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }
  const admin = await prisma.admin.create({
    data: {
      name: `Admin ${RUN_ID}`,
      email: `${RUN_ID}-${suffix}-admin@example.test`,
      passwordHash: await bcrypt.hash('Passw0rd!test', 4),
      roleId: role.id,
    },
  });
  created.adminIds.push(admin.id);
  const token = generateAccessToken({ id: admin.id, email: admin.email }, 'admin');
  return { admin, role, token };
}

async function variantStock(variantId) {
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
  return v?.stock;
}

async function ordersForUser(userId) {
  return prisma.order.findMany({ where: { userId }, include: { items: true } });
}

async function cartItemsForUser(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
  return cart?.items || [];
}

async function cleanup() {
  if (created.userIds.length) {
    const orders = await prisma.order.findMany({
      where: { userId: { in: created.userIds } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length) {
      await prisma.notification.deleteMany({
        where: { link: { in: orderIds.map((id) => `/orders/${id}`) } },
      });
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.notification.deleteMany({
      where: { recipientType: 'user', recipientId: { in: created.userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  }
  if (created.productIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  }
  if (created.categoryIds.length) {
    await prisma.category.deleteMany({ where: { id: { in: created.categoryIds } } });
  }
  if (created.brandIds.length) {
    await prisma.brand.deleteMany({ where: { id: { in: created.brandIds } } });
  }
  if (created.couponIds.length) {
    await prisma.coupon.deleteMany({ where: { id: { in: created.couponIds } } });
  }
  if (created.adminIds.length) {
    await prisma.admin.deleteMany({ where: { id: { in: created.adminIds } } });
  }
  if (created.roleIds.length) {
    await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  }
  for (const key of Object.keys(created)) created[key] = [];
}

function cookieValue(response, name) {
  const list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  const row = list.find((entry) => entry.startsWith(`${name}=`));
  if (!row) return null;
  return decodeURIComponent(row.slice(name.length + 1).split(';')[0]);
}

module.exports = {
  RUN_ID,
  prisma,
  startApp,
  stopApp,
  api,
  customerToken,
  createCustomer,
  createCatalog,
  createCoupon,
  createAdmin,
  addToCart,
  variantStock,
  ordersForUser,
  cartItemsForUser,
  cleanup,
  cookieValue,
};
