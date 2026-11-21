/**
 * Upload Code 55â€“70 folders â†’ Cloudinary â†’ Winter shoes PUP-CLO-055 â€¦ PUP-CLO-070
 * Folders may be named "code 55", "Code 56", etc. (case-insensitive).
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { cloudinary, isConfigured } = require('../config/cloudinary');
const { prisma } = require('../config/prisma');

const ROOT = path.resolve(__dirname, '../../..');
const PRODUCTS_JSON = path.join(ROOT, 'src/data/products.json');
const ENRICHED = path.join(__dirname, 'data/pupasita-enriched.json');

const CODES = Array.from({ length: 16 }, (_, i) => 55 + i); // 55..70

function findCodeFolder(code) {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  const needle = new RegExp(`^code\\s*0*${code}$`, 'i');
  const match = entries.find((d) => d.isDirectory() && needle.test(d.name.trim()));
  if (!match) throw new Error(`No folder for code ${code} under ${ROOT}`);
  return path.join(ROOT, match.name);
}

function imageSortKey(name) {
  const base = path.parse(name).name;
  const shoesN = base.match(/shoes\s*[(-]?\s*(\d+)/i);
  if (shoesN) return Number(shoesN[1]);
  const paren = base.match(/\((\d+)\)/);
  if (paren) return Number(paren[1]);
  const trailing = base.match(/(\d+)\s*$/);
  if (trailing) return Number(trailing[1]);
  return 99;
}

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => {
      const ka = imageSortKey(a);
      const kb = imageSortKey(b);
      if (ka !== kb) return ka - kb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
}

async function uploadOne(filePath, skuFolder, publicId) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: `scosha/winter/${skuFolder}`,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        timeout: 120000,
      });
      return res.secure_url;
    } catch (err) {
      lastErr = err;
      console.warn(`  retry ${attempt}/3`, path.basename(filePath), err.message || err);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

async function uploadImages(code) {
  const box = findCodeFolder(code);
  const sku = `PUP-CLO-${String(code).padStart(3, '0')}`;
  const skuFolder = `pup-clo-${String(code).padStart(3, '0')}`;
  const files = listImages(box);
  if (!files.length) throw new Error(`No images in ${box}`);

  console.log(`\n[${sku}] ${box} (${files.length} images)`);
  const urls = [];
  for (const file of files) {
    const full = path.join(box, file);
    const publicId = path
      .parse(file)
      .name.replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || `img-${urls.length + 1}`;
    const url = await uploadOne(full, skuFolder, publicId);
    console.log('  uploaded', file, 'â†’', url);
    urls.push(url);
  }
  return { sku, urls };
}

function applyImages(product, urls) {
  product.images = urls;
  product.image = urls[0];
  product.image2 = urls[1] || urls[0];
  if (Array.isArray(product.colors) && product.colors[0]) {
    product.colors[0].image = urls[0];
    product.colors[0].image2 = urls[1] || urls[0];
  }
}

async function main() {
  if (!isConfigured) throw new Error('Cloudinary not configured');

  const only = process.argv.slice(2).map(Number).filter((n) => n >= 55 && n <= 70);
  const codes = only.length ? only : CODES;

  const results = [];
  for (const code of codes) {
    results.push(await uploadImages(code));
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  let enriched = null;
  let enrichedList = null;
  if (fs.existsSync(ENRICHED)) {
    enriched = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    enrichedList = enriched.products || enriched;
  }

  for (const { sku, urls } of results) {
    const p = products.find((x) => (x.specs?.SKU || x.id) === sku);
    if (!p) throw new Error(`Missing ${sku} in products.json`);
    applyImages(p, urls);
    console.log('products.json', sku, p.slug, urls.length);

    if (Array.isArray(enrichedList)) {
      for (const row of enrichedList) {
        const rowSku = row.sku || row.specs?.SKU || row.id;
        if (rowSku === sku) applyImages(row, urls);
      }
    }

    const row = await prisma.product.findFirst({ where: { slug: p.slug } });
    if (!row) {
      console.warn('DB miss (skip)', p.slug);
      continue;
    }
    await prisma.product.update({
      where: { id: row.id },
      data: { images: urls },
    });
    console.log('DB updated', sku, 'id=', row.id);
  }

  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2) + '\n');
  if (enriched) {
    fs.writeFileSync(ENRICHED, JSON.stringify(enriched, null, 2) + '\n');
    console.log('enriched updated');
  }
  console.log('\nDone:', results.map((r) => `${r.sku}:${r.urls.length}`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
