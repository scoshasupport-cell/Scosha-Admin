/**
 * Expand apparel products so customers can choose from a full size run
 * (not a single S/M/L leftover from the import sheet).
 *
 * Clothes (non-shoe/bag): XS–XXL
 * Shoes: EU 36–42 (women) / 40–46 (men) when only one size present
 * Bags / OS: leave as-is
 */
const { prisma } = require('../config/prisma');
const { slugify } = require('../utils/slugify');
const fs = require('fs');
const path = require('path');

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const WOMEN_SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const MEN_SHOE_SIZES = ['40', '41', '42', '43', '44', '45', '46'];

function buildSku(productSlug, colorName, size) {
  const base = slugify(productSlug).toUpperCase().replace(/-/g, '').slice(0, 24);
  const color = slugify(colorName || 'default')
    .toUpperCase()
    .replace(/-/g, '')
    .slice(0, 12);
  const sizePart = String(size || 'OS')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  return `${base}-${color}-${sizePart}`.slice(0, 64);
}

function isShoeSub(sub) {
  const s = String(sub || '').toLowerCase();
  return s.includes('shoe') || s.includes('sneaker') || s.includes('boot');
}

function isBagSub(sub) {
  const s = String(sub || '').toLowerCase();
  return s.includes('bag');
}

function desiredSizes(product, existing) {
  const sub = product.subCategory?.slug || product.subcategory || '';
  const uniq = [...new Set((existing || []).map((s) => String(s).trim()).filter(Boolean))];

  if (isBagSub(sub)) return uniq.length ? uniq : ['OS'];

  if (isShoeSub(sub)) {
    if (uniq.length >= 4) return uniq;
    const women = String(sub).includes('women') || String(sub).includes('women');
    return women || String(sub).includes('women-shoes') ? WOMEN_SHOE_SIZES : MEN_SHOE_SIZES;
  }

  // Apparel: always offer full letter run
  const categorySlug = product.category?.slug || product.category || '';
  if (categorySlug === 'clothes' || categorySlug === 'apparel') {
    return APPAREL_SIZES;
  }

  return uniq.length ? uniq : ['OS'];
}

async function expandDb() {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    include: {
      variants: true,
      category: true,
      subCategory: true,
    },
  });

  let expanded = 0;
  for (const product of products) {
    const existingSizes = [...new Set(product.variants.map((v) => v.size))];
    const targetSizes = desiredSizes(product, existingSizes);
    if (targetSizes.length <= existingSizes.length && existingSizes.every((s) => targetSizes.includes(s))) {
      // still ensure apparel gets full run even if only M exists
      const missing = targetSizes.filter((s) => !existingSizes.includes(s));
      if (!missing.length) continue;
    }

    const colorsMap = new Map();
    for (const v of product.variants) {
      const key = `${v.colorName || 'Default'}|${v.colorHex || ''}`;
      if (!colorsMap.has(key)) {
        colorsMap.set(key, {
          name: v.colorName || 'Default',
          hex: v.colorHex,
          images: v.images,
          price: v.price,
          comparePrice: v.comparePrice,
        });
      }
    }
    if (!colorsMap.size) {
      colorsMap.set('Default|', {
        name: 'Default',
        hex: null,
        images: product.images,
        price: product.basePrice,
        comparePrice: product.comparePrice,
      });
    }

    const totalStock = product.variants.reduce((n, v) => n + Number(v.stock || 0), 0);
    const per = Math.max(
      1,
      Math.floor(totalStock / (colorsMap.size * targetSizes.length)) || 1,
    );

    // Keep existing variants' stock when size already exists; create missing sizes
    for (const color of colorsMap.values()) {
      for (const size of targetSizes) {
        const sku = buildSku(product.slug, color.name, size);
        const existing = product.variants.find(
          (v) =>
            v.size === size &&
            String(v.colorName || 'Default') === String(color.name),
        );
        if (existing) continue;

        const uniqueSku = `${sku}-${String(product.id).slice(-4)}${size}`.slice(0, 64);
        await prisma.productVariant.upsert({
          where: { sku: uniqueSku },
          create: {
            productId: product.id,
            colorName: color.name,
            colorHex: color.hex,
            size: String(size).slice(0, 40),
            sku: uniqueSku,
            price: color.price ?? product.basePrice,
            comparePrice: color.comparePrice ?? product.comparePrice,
            stock: per,
            images: color.images || product.images || [],
            status: 'active',
          },
          update: {
            stock: per,
            status: 'active',
            price: color.price ?? product.basePrice,
          },
        });
      }
    }
    expanded += 1;
  }
  console.log('expanded products', expanded);
}

async function expandStorefrontJson() {
  const file = path.resolve(__dirname, '../../../src/data/products.json');
  const products = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const p of products) {
    const target = desiredSizes(
      { category: p.category, subcategory: p.subcategory, subCategory: { slug: p.subcategory } },
      p.sizes || [],
    );
    if (JSON.stringify(p.sizes) !== JSON.stringify(target)) {
      p.sizes = target;
      n += 1;
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(products, null, 1)}\n`, 'utf8');
  console.log('storefront sizes updated', n);
}

async function ensureLbpSetting() {
  const settings = await prisma.setting.findFirst();
  if (!settings) return;
  const shipping =
    settings.shipping && typeof settings.shipping === 'object' ? { ...settings.shipping } : {};
  if (shipping.usdToLbp == null) {
    shipping.usdToLbp = 89500;
    await prisma.setting.update({
      where: { id: settings.id },
      data: { shipping },
    });
    console.log('set shipping.usdToLbp=89500');
  }
}

async function main() {
  await expandDb();
  await expandStorefrontJson();
  await ensureLbpSetting();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
