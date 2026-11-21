/**
 * Concurrent load against the real MySQL via the in-process app.
 * Not a production capacity claim. Run: npm run load
 *
 * LOAD_CONCURRENCY=20 LOAD_REQUESTS=200 npm run load
 * LOAD_MODE=sweep npm run load          # 1,5,10,20 workers
 * LOAD_MODE=mix npm run load            # realistic traffic mix
 */
const h = require('./helpers');

const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 20);
const REQUESTS = Number(process.env.LOAD_REQUESTS || 200);
const MODE = process.argv[2] || process.env.LOAD_MODE || 'browse';

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(label, samples, errors, statuses, elapsedMs, concurrency) {
  const rps = elapsedMs > 0 ? (samples.length / (elapsedMs / 1000)).toFixed(1) : '0';
  const statusText = [...statuses.entries()].map(([s, n]) => `${s}×${n}`).join(' ');
  const row = {
    label,
    concurrency,
    n: samples.length,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
    p99: percentile(samples, 99),
    max: Math.max(0, ...samples),
    errors,
    rps: Number(rps),
  };
  console.log(
    `${label.padEnd(36)} conc=${String(concurrency).padStart(2)} n=${String(row.n).padStart(4)}  p50 ${row.p50.toFixed(1).padStart(7)}ms  p95 ${row.p95.toFixed(1).padStart(7)}ms  p99 ${row.p99.toFixed(1).padStart(7)}ms  rps ${String(row.rps).padStart(6)}  err ${errors}  ${statusText}`
  );
  return row;
}

async function barrage(label, factory, concurrency, requests) {
  const jobs = Array.from({ length: requests }, (_, i) => i);
  const samples = [];
  const statuses = new Map();
  let errors = 0;

  async function worker() {
    while (jobs.length) {
      jobs.pop();
      const res = await factory();
      samples.push(res.durationMs);
      statuses.set(res.status, (statuses.get(res.status) || 0) + 1);
      if (res.status >= 400) errors += 1;
    }
  }

  const started = Date.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return summarize(label, samples, errors, statuses, Date.now() - started, concurrency);
}

function pick(weights) {
  const total = weights.reduce((s, w) => s + w[1], 0);
  let r = Math.random() * total;
  for (const [fn, weight] of weights) {
    r -= weight;
    if (r <= 0) return fn;
  }
  return weights[0][0];
}

async function mix(ctx, concurrency, requests) {
  const weights = [
    [() => h.api('/products?limit=12'), 40],
    [() => h.api(`/products/${encodeURIComponent(ctx.slug)}`), 20],
    [() => h.api('/search?q=dress&limit=12'), 10],
    [() => h.api('/categories'), 10],
    [() => h.api('/cart', { token: ctx.token }), 10],
    [() => h.api('/auth/me', { token: ctx.token }), 5],
    [() => h.api('/orders/preview', { method: 'POST', token: ctx.token, body: { addressId: ctx.addressId } }), 5],
  ];
  return barrage('MIX browse/search/cart/preview', () => pick(weights)(), concurrency, requests);
}

async function main() {
  await h.startApp();
  const counts = {
    products: await h.prisma.product.count({ where: { status: 'active' } }),
    variants: await h.prisma.productVariant.count(),
  };
  console.log('Data set:', counts);
  console.log(`Mode=${MODE} (in-process, localhost — not a staging/network benchmark)\n`);

  const sample = await h.prisma.product.findFirst({
    where: { status: 'active' },
    select: { slug: true },
  });
  const customer = await h.createCustomer();
  const catalog = await h.createCatalog({ variants: [{ price: 19.99, stock: 50 }] });
  await h.addToCart(customer.user.id, catalog.variants[0], 1);
  const ctx = {
    slug: sample?.slug || 'missing',
    token: customer.token,
    addressId: customer.address.id,
  };

  const rows = [];
  if (MODE === 'sweep') {
    for (const conc of [1, 5, 10, 20]) {
      rows.push(await barrage('GET /products?limit=12', () => h.api('/products?limit=12'), conc, REQUESTS));
    }
  } else if (MODE === 'mix') {
    rows.push(await mix(ctx, CONCURRENCY, REQUESTS));
    rows.push(await barrage('GET /health/live', () => h.api('/health/live'), CONCURRENCY, REQUESTS));
    rows.push(await barrage('GET /health/ready', () => h.api('/health/ready'), CONCURRENCY, REQUESTS));
  } else {
    rows.push(await barrage('GET /products?limit=12', () => h.api('/products?limit=12'), CONCURRENCY, REQUESTS));
    rows.push(await barrage('GET /search?q=dress', () => h.api('/search?q=dress&limit=12'), CONCURRENCY, REQUESTS));
    rows.push(await barrage('GET /health/ready', () => h.api('/health/ready'), CONCURRENCY, REQUESTS));
    rows.push(await barrage('GET /health/live', () => h.api('/health/live'), CONCURRENCY, REQUESTS));
  }

  await h.cleanup();
  await h.stopApp();
  await h.prisma.$disconnect();

  const failed = rows.filter((r) => r.errors > 0);
  if (failed.length) {
    console.error(`\nLoad run had errors on: ${failed.map((r) => r.label).join(', ')}`);
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error(error);
  await h.cleanup().catch(() => {});
  await h.stopApp().catch(() => {});
  process.exit(1);
});
