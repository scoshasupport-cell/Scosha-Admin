/**
 * Upload 4shoes â†’ Cloudinary â†’ Winter shoes product 4 (PUP-CLO-056 / tinetill)
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { cloudinary, isConfigured } = require('../config/cloudinary');
const { prisma } = require('../config/prisma');

const ROOT = path.resolve(__dirname, '../../..');
const BOX = path.join(ROOT, '4shoes');
const PRODUCTS_JSON = path.join(ROOT, 'src/data/products.json');
const ENRICHED = path.join(__dirname, 'data/pupasita-enriched.json');
const SKU = 'PUP-CLO-056';
const SOURCE_URL =
  'https://www.amazon.de/-/en/tinetill-Womens-Pleated-Winter-Elegant/dp/B0CFHHRV4H?th=1&psc=1';

async function uploadImages() {
  if (!isConfigured) throw new Error('Cloudinary not configured');
  const files = fs
    .readdirSync(BOX)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) throw new Error(`No images in ${BOX}`);

  const urls = [];
  for (const file of files) {
    const full = path.join(BOX, file);
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await cloudinary.uploader.upload(full, {
          folder: 'scosha/winter/pup-clo-056',
          public_id: path
            .parse(file)
            .name.replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 80),
          overwrite: true,
          resource_type: 'image',
          timeout: 120000,
        });
        console.log('uploaded', file, 'â†’', res.secure_url);
        urls.push(res.secure_url);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`retry ${attempt}/3`, file, err.message || err);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (lastErr) throw lastErr;
  }

  return [...urls].sort((a, b) => {
    const na = Number((a.match(/shoes(\d+)/i) || a.match(/(\d+)/) || [])[1] || 99);
    const nb = Number((b.match(/shoes(\d+)/i) || b.match(/(\d+)/) || [])[1] || 99);
    return na - nb;
  });
}

function applyImages(product, urls) {
  product.images = urls;
  product.image = urls[0];
  product.image2 = urls[1] || urls[0];
  if (Array.isArray(product.colors) && product.colors[0]) {
    product.colors[0].image = urls[0];
    product.colors[0].image2 = urls[1] || urls[0];
  }
  if (!product.specs) product.specs = {};
  product.specs['Source URL'] = SOURCE_URL;
}

async function main() {
  console.log('Box:', BOX, 'â†’', SKU);
  const urls = await uploadImages();
  console.log('urls', urls.length);

  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  const p = products.find((x) => (x.specs?.SKU || x.id) === SKU);
  if (!p) throw new Error(`Missing ${SKU} in products.json`);
  applyImages(p, urls);
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2) + '\n');
  console.log('products.json updated', p.slug);

  if (fs.existsSync(ENRICHED)) {
    const data = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    const list = data.products || data;
    if (Array.isArray(list)) {
      for (const row of list) {
        const sku = row.sku || row.specs?.SKU || row.id;
        if (sku === SKU) applyImages(row, urls);
      }
      fs.writeFileSync(ENRICHED, JSON.stringify(data, null, 2) + '\n');
      console.log('enriched updated');
    }
  }

  const row = await prisma.product.findFirst({ where: { slug: p.slug } });
  if (!row) throw new Error(`DB miss ${p.slug}`);
  const specs =
    row.specs && typeof row.specs === 'object' && !Array.isArray(row.specs)
      ? { ...row.specs }
      : {};
  specs['Source URL'] = SOURCE_URL;
  await prisma.product.update({
    where: { id: row.id },
    data: { images: urls, specs },
  });
  console.log('DB updated id=', row.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
