/**
 * Cap/fix storefront prices that were imported without FX (e.g. PKR as USD).
 */
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');

const FX = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  INR: 0.012,
  AED: 0.27,
  PKR: 0.0036,
  ZAR: 0.055,
};

const enrichedPath = path.resolve(__dirname, 'data/pupasita-enriched.json');

async function main() {
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  const bySlug = new Map((enriched.products || []).map((p) => [p.slug, p]));
  const storefront = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../src/data/products.json'), 'utf8'),
  );

  let fixed = 0;
  for (const p of storefront) {
    const price = Number(p.price || 0);
    if (price <= 1500) continue;
    const meta = bySlug.get(p.slug)?.meta || {};
    const liveCur = String(meta['Live currency'] || '').toUpperCase();
    const liveAmt = Number(meta['Live price'] || 0);
    let usd = null;
    if (liveCur && liveAmt > 0 && FX[liveCur]) {
      usd = Math.round(liveAmt * FX[liveCur] * 100) / 100;
    }
    // Fallback: if still absurd, use compareAt or a sane default from sheet qty price fields
    if (!usd || usd > 1500) {
      const sheet = Number(meta['Sheet price'] || meta.sheetPrice || 0);
      if (sheet > 0 && sheet < 1500) usd = sheet;
    }
    if (!usd || usd > 1500) {
      // last resort: divide PKR-like figures
      if (price > 10000) usd = Math.round(price * 0.0036 * 100) / 100;
      else if (price > 1500) usd = Math.round(price * 0.012 * 100) / 100;
    }
    if (!usd || usd <= 0 || usd > 1500) continue;

    p.price = usd;
    if (p.compareAt && Number(p.compareAt) > usd * 3) p.compareAt = null;
    if (Array.isArray(p.colors)) {
      /* keep */
    }
    const db = await prisma.product.findFirst({ where: { slug: p.slug } });
    if (db) {
      await prisma.product.update({
        where: { id: db.id },
        data: { basePrice: usd, comparePrice: p.compareAt },
      });
      await prisma.productVariant.updateMany({
        where: { productId: db.id },
        data: { price: usd },
      });
    }
    fixed += 1;
    console.log('fixed', p.slug.slice(0, 50), price, '->', usd, liveCur || '?');
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../../../src/data/products.json'),
    `${JSON.stringify(storefront, null, 1)}\n`,
    'utf8',
  );
  console.log('fixed prices', fixed);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
