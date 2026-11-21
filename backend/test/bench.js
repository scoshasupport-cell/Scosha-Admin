/**
 * Measures real API latency in-process against the real database and prints EXPLAIN for the
 * queries the storefront actually runs. Not a test: run with `npm run bench` and paste the
 * numbers into the report. Numbers depend on the machine and the data set.
 */
const h = require('./helpers');

const ITERATIONS = Number(process.env.BENCH_ITERATIONS || 30);

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function measure(label, fn) {
  await fn(); // warm-up
  const samples = [];
  let lastStatus = null;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const res = await fn();
    lastStatus = res.status;
    samples.push(res.durationMs);
  }
  const row = {
    endpoint: label,
    status: lastStatus,
    p50: percentile(samples, 50).toFixed(1),
    p95: percentile(samples, 95).toFixed(1),
    max: Math.max(...samples).toFixed(1),
  };
  console.log(`${row.endpoint.padEnd(44)} ${String(row.status).padEnd(4)} p50 ${row.p50.padStart(7)}ms  p95 ${row.p95.padStart(7)}ms  max ${row.max.padStart(7)}ms`);
  return row;
}

async function explain(label, sql) {
  // Prisma returns EXPLAIN columns positionally (f0..fN); FORMAT=TREE gives one readable string.
  const rows = await h.prisma.$queryRawUnsafe(`EXPLAIN FORMAT=TREE ${sql}`);
  console.log(`\nEXPLAIN ${label}`);
  for (const r of rows) {
    const text = String(Object.values(r)[0] || '').trimEnd();
    console.log(text.split('\n').map((line) => `  ${line}`).join('\n'));
  }
}

async function main() {
  await h.startApp();
  const counts = {
    products: await h.prisma.product.count({ where: { status: 'active' } }),
    variants: await h.prisma.productVariant.count(),
    orders: await h.prisma.order.count(),
    users: await h.prisma.user.count(),
  };
  console.log('Data set:', counts);
  console.log(`Iterations per endpoint: ${ITERATIONS} (sequential, in-process, localhost)\n`);

  const sample = await h.prisma.product.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, categoryId: true },
  });
  const category = sample
    ? await h.prisma.category.findUnique({ where: { id: sample.categoryId }, select: { slug: true } })
    : null;

  const customer = await h.createCustomer();
  const catalog = await h.createCatalog({ variants: [{ price: 19.99, stock: 50 }] });
  await h.addToCart(customer.user.id, catalog.variants[0], 2);

  await measure('GET /health/ready', () => h.api('/health/ready'));
  await measure('GET /products?limit=12', () => h.api('/products?limit=12'));
  await measure('GET /products?limit=12&sort=price_asc', () => h.api('/products?limit=12&sort=price_asc'));
  if (category) {
    await measure(`GET /products?category=<slug>&limit=12`, () =>
      h.api(`/products?category=${encodeURIComponent(category.slug)}&limit=12`)
    );
  }
  if (sample) {
    await measure('GET /products/:slug', () => h.api(`/products/${encodeURIComponent(sample.slug)}`));
  }
  await measure('GET /search?q=dress&limit=12', () => h.api('/search?q=dress&limit=12'));
  await measure('GET /search?q=zzzz-no-match', () => h.api('/search?q=zzzz-no-match&limit=12'));
  await measure('GET /categories', () => h.api('/categories'));
  await measure('GET /homepage', () => h.api('/homepage'));
  await measure('GET /cart (customer)', () => h.api('/cart', { token: customer.token }));
  await measure('POST /orders/preview', () =>
    h.api('/orders/preview', {
      method: 'POST',
      token: customer.token,
      body: { addressId: customer.address.id },
    })
  );
  await measure('GET /orders (customer list)', () => h.api('/orders', { token: customer.token }));

  await explain(
    'storefront listing (status filter + newest)',
    `SELECT id FROM products WHERE status = 'active' ORDER BY createdAt DESC LIMIT 12`
  );
  await explain(
    'category listing',
    `SELECT id FROM products WHERE status = 'active' AND categoryId = 1 ORDER BY createdAt DESC LIMIT 12`
  );
  await explain(
    'price sort',
    `SELECT id FROM products WHERE status = 'active' ORDER BY basePrice ASC LIMIT 12`
  );
  await explain(
    'search contains (name/description/slug)',
    `SELECT id FROM products WHERE status = 'active' AND (name LIKE '%dress%' OR description LIKE '%dress%' OR slug LIKE '%dress%') ORDER BY createdAt DESC LIMIT 12`
  );
  await explain('product by slug', `SELECT id FROM products WHERE slug = 'x'`);
  await explain(
    'customer orders',
    `SELECT id FROM orders WHERE userId = 1 ORDER BY createdAt DESC LIMIT 10`
  );
  await explain(
    'admin orders by status',
    `SELECT id FROM orders WHERE status = 'pending' ORDER BY createdAt DESC LIMIT 20`
  );
  await explain(
    'admin order search (contains)',
    `SELECT id FROM orders WHERE orderNumber LIKE '%SCO%' OR shipEmail LIKE '%a%' ORDER BY createdAt DESC LIMIT 20`
  );
  await explain(
    'variants for product',
    `SELECT id FROM product_variants WHERE productId = 1 AND status = 'active'`
  );
  await explain(
    'low stock',
    `SELECT id FROM product_variants WHERE stock <= 5 AND status <> 'inactive' ORDER BY stock ASC LIMIT 20`
  );
  await explain(
    'cart by user',
    `SELECT id FROM carts WHERE userId = 1`
  );
  await explain(
    'revenue chart',
    `SELECT DATE(createdAt) d, SUM(total) FROM orders WHERE createdAt >= '2026-01-01' AND status IN ('confirmed','processing','shipped','delivered') GROUP BY DATE(createdAt)`
  );
  await explain(
    'top products',
    `SELECT oi.productId, SUM(oi.quantity) q FROM order_items oi INNER JOIN orders o ON o.id = oi.orderId WHERE oi.productId IS NOT NULL AND o.status IN ('pending','confirmed') GROUP BY oi.productId ORDER BY q DESC LIMIT 10`
  );

  await h.cleanup();
  await h.stopApp();
  await h.prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await h.cleanup().catch(() => {});
  await h.stopApp().catch(() => {});
  process.exit(1);
});
