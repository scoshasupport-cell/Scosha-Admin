/**
 * 1) Upload 1.box1 images to Cloudinary â†’ first Winter collection product (PUP-CLO-053)
 * 2) Sync Winter collection sheet "actual price" onto all winter products
 *    (no discounts / compareAt cleared)
 *
 * Usage: node backend/src/scripts/sync-winter-sheet.js
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { cloudinary, isConfigured } = require('../config/cloudinary');

const ROOT = path.resolve(__dirname, '../../..');
const XLSX = path.join(ROOT, 'Pupasita Data 1 (6).xlsx');
const BOX1 = path.join(ROOT, '1.box1');
const PRODUCTS_JSON = path.join(ROOT, 'src/data/products.json');
const ENRICHED = path.join(__dirname, 'data/pupasita-enriched.json');

const FIRST_WINTER_SKU = 'PUP-CLO-053';

async function uploadBox1Images() {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_* in backend/.env)');
  }
  const files = fs
    .readdirSync(BOX1)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) throw new Error(`No images in ${BOX1}`);

  const urls = [];
  for (const file of files) {
    const full = path.join(BOX1, file);
    const res = await cloudinary.uploader.upload(full, {
      folder: 'scosha/winter/pup-clo-053',
      public_id: path.parse(file).name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
      overwrite: true,
      resource_type: 'image',
    });
    console.log('uploaded', file, 'â†’', res.secure_url);
    urls.push(res.secure_url);
  }
  return urls;
}

function loadWinterPricesFromSheet() {
  // Prefer openpyxl via python for reliable xlsx read
  const { execFileSync } = require('child_process');
  const py = `
import json, openpyxl
wb=openpyxl.load_workbook(r${JSON.stringify(XLSX)}, data_only=True)
ws=wb['Winter collection']
rows=[]
for r in ws.iter_rows(min_row=2, values_only=True):
  code=r[1] if len(r)>1 else None
  link=r[2] if len(r)>2 else None
  price=r[5] if len(r)>5 else None
  if code is None or price is None: continue
  try: code=int(code)
  except: continue
  try: price=float(price)
  except: continue
  rows.append({"code": code, "sku": f"PUP-CLO-{code:03d}", "price": round(price,2), "link": str(link or "").strip()})
print(json.dumps(rows))
`;
  const out = execFileSync('python', ['-c', py], { encoding: 'utf8' });
  return JSON.parse(out.trim());
}

function updateProductsJson(imageUrls, priceBySku) {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  let imgUpdated = 0;
  let priceUpdated = 0;
  for (const p of products) {
    const sku = p.specs?.SKU || p.id;
    if (sku === FIRST_WINTER_SKU && imageUrls?.length) {
      p.images = imageUrls;
      p.image = imageUrls[0];
      p.image2 = imageUrls[1] || imageUrls[0];
      if (Array.isArray(p.colors) && p.colors[0]) {
        p.colors[0].image = imageUrls[0];
        p.colors[0].image2 = imageUrls[1] || imageUrls[0];
      }
      imgUpdated += 1;
    }
    if (priceBySku.has(sku)) {
      const price = priceBySku.get(sku);
      if (Number(p.price) !== price || p.compareAt != null) {
        p.price = price;
        p.compareAt = null;
        if (p.specs) {
          p.specs['Live price'] = price;
          p.specs['Live currency'] = 'USD';
        }
        priceUpdated += 1;
      }
    }
  }
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2) + '\n');
  return { imgUpdated, priceUpdated, total: products.length };
}

function updateEnriched(imageUrls, priceBySku) {
  if (!fs.existsSync(ENRICHED)) return { skipped: true };
  const data = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
  const list = data.products || data;
  if (!Array.isArray(list)) return { skipped: true };
  let n = 0;
  for (const p of list) {
    const sku = p.sku || p.specs?.SKU || p.id;
    if (sku === FIRST_WINTER_SKU && imageUrls?.length) {
      p.images = imageUrls;
      p.image = imageUrls[0];
      n += 1;
    }
    if (priceBySku.has(sku)) {
      const price = priceBySku.get(sku);
      p.price = price;
      p.basePrice = price;
      p.compareAt = null;
      p.comparePrice = null;
      n += 1;
    }
  }
  fs.writeFileSync(ENRICHED, JSON.stringify(data, null, 2) + '\n');
  return { updated: n };
}

async function updateDatabase(imageUrls, priceBySku) {
  const { prisma } = require('../config/prisma');
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  let img = 0;
  let price = 0;

  for (const p of products) {
    const sku = p.specs?.SKU || p.id;
    if (!priceBySku.has(sku) && sku !== FIRST_WINTER_SKU) continue;

    const row = await prisma.product.findFirst({
      where: { slug: p.slug },
      select: { id: true, specs: true },
    });
    if (!row) {
      console.warn('DB miss slug', p.slug);
      continue;
    }

    const sheetPrice = priceBySku.has(sku) ? priceBySku.get(sku) : Number(p.price);
    const data = {
      basePrice: sheetPrice,
      comparePrice: null,
      badge: p.badge || null,
    };
    if (sku === FIRST_WINTER_SKU && imageUrls?.length) {
      data.images = imageUrls;
      img += 1;
    }

    const specs =
      row.specs && typeof row.specs === 'object' && !Array.isArray(row.specs)
        ? { ...row.specs }
        : {};
    specs.SKU = specs.SKU || sku;
    specs['Live price'] = sheetPrice;
    specs['Live currency'] = 'USD';
    data.specs = specs;

    await prisma.product.update({ where: { id: row.id }, data });
    await prisma.productVariant.updateMany({
      where: { productId: row.id },
      data: { price: sheetPrice, comparePrice: null },
    });
    price += 1;
    console.log('DB updated', sku, 'id=', row.id, 'price=', sheetPrice);
  }

  await prisma.$disconnect();
  return { img, price };
}

async function main() {
  console.log('Sheet:', XLSX);
  console.log('Box1:', BOX1);

  const winterRows = loadWinterPricesFromSheet();
  console.log('Winter sheet rows:', winterRows.length);
  const priceBySku = new Map(winterRows.map((r) => [r.sku, r.price]));

  console.log('\n--- Cloudinary upload ---');
  const imageUrls = await uploadBox1Images();
  console.log('Images for', FIRST_WINTER_SKU, imageUrls.length);

  console.log('\n--- products.json ---');
  const pj = updateProductsJson(imageUrls, priceBySku);
  console.log(pj);

  console.log('\n--- enriched ---');
  console.log(updateEnriched(imageUrls, priceBySku));

  console.log('\n--- database ---');
  const db = await updateDatabase(imageUrls, priceBySku);
  console.log(db);

  const first = winterRows.find((r) => r.sku === FIRST_WINTER_SKU);
  console.log('\nDone. First winter product', FIRST_WINTER_SKU, 'sheet price', first?.price);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
