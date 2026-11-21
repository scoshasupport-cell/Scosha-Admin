/**
 * Sync B12-curtains sheet actual prices onto furniture products.
 * Always uses sheet "actual price" — clears discounts / compareAt / sale badges.
 *
 * Usage: node backend/src/scripts/sync-curtain-actual-prices.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { prisma } = require('../config/prisma');

const ROOT = path.resolve(__dirname, '../../..');
const XLSX = path.join(ROOT, 'Pupasita Data 1 (6).xlsx');
const PRODUCTS_JSON = path.join(ROOT, 'src/data/products.json');
const ENRICHED = path.join(__dirname, 'data/pupasita-enriched.json');

function loadCurtainPrices() {
  const py = `
import json, openpyxl
wb=openpyxl.load_workbook(r${JSON.stringify(XLSX)}, data_only=True)
ws=wb['B12-curtains']
rows=[]
for r in ws.iter_rows(min_row=2, values_only=True):
  code=r[1] if len(r)>1 else None
  price=r[4] if len(r)>4 else None
  if code is None or price is None: continue
  try: code=int(code); price=float(price)
  except: continue
  rows.append({"code": code, "sku": f"PUP-FUR-{code:03d}", "price": round(price, 2)})
print(json.dumps(rows))
`;
  const out = execFileSync('python', ['-c', py], { encoding: 'utf8' });
  return JSON.parse(out.trim());
}

function clearSaleBadge(badge) {
  if (typeof badge === 'string' && /^-\d+%/.test(badge.trim())) return null;
  return badge ?? null;
}

function applyPrice(product, price) {
  product.price = price;
  product.compareAt = null;
  product.badge = clearSaleBadge(product.badge);
  if (!product.specs) product.specs = {};
  product.specs['Live price'] = price;
  product.specs['Live currency'] = 'USD';
  product.specs['Sheet actual price'] = price;
  delete product.specs['Sheet discount price'];
}

async function main() {
  console.log('Sheet:', XLSX);
  const rows = loadCurtainPrices();
  console.log('curtain priced rows:', rows.length);
  const priceBySku = new Map(rows.map((r) => [r.sku, r.price]));

  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  let sf = 0;
  for (const p of products) {
    const sku = p.specs?.SKU || p.id;
    if (!priceBySku.has(sku)) continue;
    const price = priceBySku.get(sku);
    const before = [p.price, p.compareAt, p.badge];
    applyPrice(p, price);
    if (JSON.stringify([p.price, p.compareAt, p.badge]) !== JSON.stringify(before)) sf += 1;
  }
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2) + '\n');
  console.log('products.json updated:', sf);

  if (fs.existsSync(ENRICHED)) {
    const data = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    const list = data.products || data;
    let n = 0;
    if (Array.isArray(list)) {
      for (const p of list) {
        const sku = p.sku || p.specs?.SKU || p.id;
        if (!priceBySku.has(sku)) continue;
        const price = priceBySku.get(sku);
        p.price = price;
        p.basePrice = price;
        p.compareAt = null;
        p.comparePrice = null;
        p.badge = clearSaleBadge(p.badge);
        n += 1;
      }
      fs.writeFileSync(ENRICHED, JSON.stringify(data, null, 2) + '\n');
    }
    console.log('enriched updated:', n);
  }

  let db = 0;
  let miss = 0;
  for (const p of products) {
    const sku = p.specs?.SKU || p.id;
    if (!priceBySku.has(sku)) continue;
    const price = priceBySku.get(sku);
    const row = await prisma.product.findFirst({
      where: { slug: p.slug },
      select: { id: true, specs: true },
    });
    if (!row) {
      miss += 1;
      console.warn('DB miss', sku, p.slug);
      continue;
    }
    const specs =
      row.specs && typeof row.specs === 'object' && !Array.isArray(row.specs)
        ? { ...row.specs }
        : {};
    specs.SKU = specs.SKU || sku;
    specs['Live price'] = price;
    specs['Live currency'] = 'USD';
    specs['Sheet actual price'] = price;
    delete specs['Sheet discount price'];

    await prisma.product.update({
      where: { id: row.id },
      data: {
        basePrice: price,
        comparePrice: null,
        badge: clearSaleBadge(p.badge),
        specs,
      },
    });
    await prisma.productVariant.updateMany({
      where: { productId: row.id },
      data: { price, comparePrice: null },
    });
    db += 1;
    console.log('DB', sku, '→', price);
  }

  const stillOnSale = products.filter(
    (p) => (p.specs?.SKU || p.id || '').startsWith('PUP-FUR-') && p.compareAt != null,
  );
  console.log('done. db=', db, 'miss=', miss, 'remaining compareAt=', stillOnSale.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
