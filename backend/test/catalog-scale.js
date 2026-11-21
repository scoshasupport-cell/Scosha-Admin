/**
 * Catalog-size listing/search bench. Refuses to run against the default scosha schema.
 * Set BENCH_DATABASE_URL to a disposable database, then:
 *   BENCH_DATABASE_URL=... BENCH_PRODUCTS=1000 node test/catalog-scale.js
 *
 * This script inserts tagged rows and deletes them in finally().
 */
const TARGET = Number(process.env.BENCH_PRODUCTS || 1000);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 10);
const REQUESTS = Number(process.env.LOAD_REQUESTS || 80);

function assertBenchUrl() {
  const url = process.env.BENCH_DATABASE_URL || '';
  if (!url) {
    throw new Error('BENCH_DATABASE_URL is required. Refusing to inflate the shared/dev catalog.');
  }
  if (/\/scosha(\?|$)/i.test(url) && !/scosha_bench|scosha_staging/i.test(url)) {
    throw new Error('BENCH_DATABASE_URL looks like the primary scosha schema. Use scosha_bench or scosha_staging.');
  }
  process.env.DATABASE_URL = url;
  process.env.SCOSHA_BENCH = '1';
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function seed(h, count) {
  const brand = await h.prisma.brand.create({
    data: { name: `Bench ${h.RUN_ID || 'scale'}`, slug: `bench-brand-${Date.now()}` },
  });
  const category = await h.prisma.category.create({
    data: { name: 'Bench', slug: `bench-cat-${Date.now()}`, status: 'active' },
  });
  const products = [];
  for (let i = 0; i < count; i += 1) {
    products.push({
      name: i % 17 === 0 ? `Bench dress ${i}` : `Bench item ${i}`,
      slug: `bench-item-${Date.now()}-${i}`,
      description: i % 17 === 0 ? 'A wool dress for winter' : 'Generic bench product',
      brandId: brand.id,
      categoryId: category.id,
      basePrice: 19.99,
      status: 'active',
    });
  }
  const chunk = 200;
  for (let i = 0; i < products.length; i += chunk) {
    await h.prisma.product.createMany({ data: products.slice(i, i + chunk) });
  }
  return { brandId: brand.id, categoryId: category.id };
}

async function barrage(label, factory) {
  const jobs = Array.from({ length: REQUESTS }, (_, i) => i);
  const samples = [];
  let errors = 0;
  async function worker() {
    while (jobs.length) {
      jobs.pop();
      const res = await factory();
      samples.push(res.durationMs);
      if (res.status >= 400) errors += 1;
    }
  }
  const started = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const elapsed = Date.now() - started;
  console.log(
    `${label.padEnd(28)} n=${samples.length} p50 ${percentile(samples, 50).toFixed(1)}ms  p95 ${percentile(samples, 95).toFixed(1)}ms  p99 ${percentile(samples, 99).toFixed(1)}ms  rps ${(samples.length / (elapsed / 1000)).toFixed(1)}  err ${errors}`
  );
  return errors;
}

async function main() {
  assertBenchUrl();
  const h = require('./helpers');
  await h.startApp();
  const seeded = await seed(h, TARGET);
  console.log(`Seeded ${TARGET} products into the bench database (brand ${seeded.brandId})`);
  const listingErrors = await barrage('GET /products?limit=12', () => h.api('/products?limit=12'));
  const searchErrors = await barrage('GET /search?q=dress', () => h.api('/search?q=dress&limit=12'));
  await h.prisma.product.deleteMany({ where: { brandId: seeded.brandId } });
  await h.prisma.brand.delete({ where: { id: seeded.brandId } });
  await h.prisma.category.delete({ where: { id: seeded.categoryId } });
  await h.stopApp();
  await h.prisma.$disconnect();
  if (listingErrors || searchErrors) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
