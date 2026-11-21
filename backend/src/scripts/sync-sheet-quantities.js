/**
 * Sync "Quantites" from Pupasita Data 1 (6).xlsx onto Scosha products
 * for both sheets:
 *   - B12-curtains  → furniture (SCO-FUR-###)
 *   - Winter collection → clothes (SCO-CLO-###)
 *
 * Usage: node src/scripts/sync-sheet-quantities.js
 */
const path = require('path');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { prisma } = require('../config/prisma');

const ROOT = path.resolve(__dirname, '../../..');
const XLSX = path.join(ROOT, 'Pupasita Data 1 (6).xlsx');

function loadSheetRows() {
  const py = `
import json, openpyxl
wb = openpyxl.load_workbook(r${JSON.stringify(XLSX)}, data_only=True)
out = []

def pack(sheet, prefix):
  ws = wb[sheet]
  for r in ws.iter_rows(min_row=2, values_only=True):
    code = r[1] if len(r) > 1 else None
    qty = r[3] if len(r) > 3 else None
    size = r[4] if sheet == "Winter collection" and len(r) > 4 else None
    if code is None: continue
    try:
      code = int(code)
      qty = int(qty) if qty is not None and str(qty).strip() != "" else 0
    except Exception:
      continue
    out.append({
      "sheet": sheet,
      "prefix": prefix,
      "code": code,
      "qty": max(0, qty),
      "size": None if size is None else str(size).strip(),
    })

pack("B12-curtains", "FUR")
pack("Winter collection", "CLO")
print(json.dumps(out))
`;
  const raw = execFileSync('python', ['-c', py], { encoding: 'utf8' });
  return JSON.parse(raw.trim());
}

/** Extract { prefix: 'CLO'|'FUR', code: number } from SKU or slug */
function parsePupCode(skuOrSlug) {
  const s = String(skuOrSlug || '');
  const m = s.match(/(?:SCO|PUP)[-_]?(CLO|FUR)[-_]?0*(\d{1,4})/i);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), code: Number(m[2]) };
}

function normalizeSize(value) {
  if (value == null) return '';
  let s = String(value).trim().toUpperCase().replace(/\s+/g, '');
  if (!s || s === 'NONE' || s === 'NULL') return '';
  if (s === '2XL') return 'XXL';
  if (s === '3XL') return 'XXXL';
  // Ranges like 38-40 → prefer first number for matching shoe sizes
  if (/^\d{2}-\d{2}$/.test(s)) return s.split('-')[0];
  if (s === 'S-M') return 'S';
  return s;
}

/**
 * Exact sheet quantity on the matching sheet size when possible.
 * Total stock across variants always equals qty.
 */
function assignStock(variants, qty, sizeHint) {
  const n = variants.length;
  const stocks = Array(n).fill(0);
  if (qty <= 0 || n === 0) return stocks;

  const want = normalizeSize(sizeHint);
  let targetIdx = -1;
  if (want) {
    targetIdx = variants.findIndex((v) => normalizeSize(v.size) === want);
    if (targetIdx < 0) {
      // Loose match: "XL" vs "xl", or numeric shoes
      targetIdx = variants.findIndex((v) => {
        const vs = normalizeSize(v.size);
        return vs === want || vs.startsWith(want) || want.startsWith(vs);
      });
    }
  }
  if (targetIdx < 0) targetIdx = 0;

  stocks[targetIdx] = qty;
  return stocks;
}

function buildIndex(products) {
  const map = new Map(); // key `${prefix}:${code}` → product (prefer padded SKU)
  for (const p of products) {
    const fromSku = parsePupCode(p.specs?.SKU);
    const fromSlug = parsePupCode(p.slug);
    const hit = fromSku || fromSlug;
    if (!hit) continue;
    const key = `${hit.prefix}:${hit.code}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      continue;
    }
    // Prefer exact SCO-XXX-000N SKU form
    const prevSku = String(prev.specs?.SKU || '');
    const nextSku = String(p.specs?.SKU || '');
    if (/^SCO-(CLO|FUR)-\d{4}$/i.test(nextSku) && !/^SCO-(CLO|FUR)-\d{4}$/i.test(prevSku)) {
      map.set(key, p);
    }
  }
  return map;
}

async function ensureVariant(product, sizeHint) {
  if (product.variants?.length) return product.variants;

  const size = sizeHint && sizeHint !== 'None' ? String(sizeHint).toUpperCase() : 'OS';
  const base = String(product.specs?.SKU || product.slug)
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 48);
  const sku = `${base}-${size}`.slice(0, 64);
  const created = await prisma.productVariant.create({
    data: {
      productId: product.id,
      colorName: 'Default',
      colorHex: null,
      size: size.slice(0, 40),
      sku,
      price: product.basePrice,
      comparePrice: product.comparePrice,
      stock: 0,
      images: product.images || [],
      status: 'active',
    },
  });
  product.variants = [created];
  return product.variants;
}

async function main() {
  console.log('Sheet:', XLSX);
  const rows = loadSheetRows();
  console.log('Sheet rows:', rows.length);

  const products = await prisma.product.findMany({
    include: { variants: true },
  });
  const index = buildIndex(products);
  console.log('Indexed Pupasita products:', index.size);

  let matched = 0;
  let updatedVariants = 0;
  let createdVariants = 0;
  const missing = [];

  for (const row of rows) {
    const key = `${row.prefix}:${row.code}`;
    const product = index.get(key);
    if (!product) {
      missing.push(key);
      continue;
    }
    matched += 1;

    const beforeCount = product.variants.length;
    let variants = await ensureVariant(product, row.size);
    if (variants.length > beforeCount) createdVariants += variants.length - beforeCount;

    // If sheet size is missing as a variant, create that size so stock lands correctly
    const want = normalizeSize(row.size);
    if (want && !variants.some((v) => normalizeSize(v.size) === want)) {
      const base = String(product.specs?.SKU || product.slug)
        .replace(/[^a-zA-Z0-9-]/g, '')
        .slice(0, 48);
      const sku = `${base}-${want}-${product.id}`.slice(0, 64);
      const created = await prisma.productVariant.create({
        data: {
          productId: product.id,
          colorName: variants[0]?.colorName || 'Default',
          colorHex: variants[0]?.colorHex || null,
          size: want.slice(0, 40),
          sku,
          price: product.basePrice,
          comparePrice: product.comparePrice,
          stock: 0,
          images: variants[0]?.images || product.images || [],
          status: 'active',
        },
      });
      variants = [...variants, created];
      createdVariants += 1;
    }

    const stocks = assignStock(variants, row.qty, row.size);
    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { stock: stocks[i] ?? 0, status: 'active' },
      });
      updatedVariants += 1;
    }

    const specs =
      product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)
        ? { ...product.specs }
        : {};
    specs['Sheet quantity'] = row.qty;
    if (want) specs['Available sizes'] = row.size;

    let badge = product.badge;
    if (row.qty > 0 && row.qty <= 3) badge = 'Low stock';
    else if (badge === 'Low stock') badge = null;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        status: product.status === 'archived' ? 'active' : product.status || 'active',
        specs,
        badge,
      },
    });

    console.log(
      `OK ${specs.SKU || product.slug} (${key}) qty=${row.qty} variants=${variants.length} → [${stocks.join(',')}]`
    );
  }

  console.log('\nDone');
  console.log({ matched, updatedVariants, createdVariants, missing: missing.length });
  if (missing.length) console.log('Missing:', missing.join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
