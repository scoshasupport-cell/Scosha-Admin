/**
 * Reorder women's apparel product images in DB to prefer garment shots.
 */
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');

const productsPath = path.resolve(__dirname, '../../../src/data/products.json');

async function main() {
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  let n = 0;
  for (const p of products) {
    if (p.category !== 'clothes') continue;
    const sub = String(p.subcategory || '');
    if (sub !== 'women' && sub !== 'women-bags' && !sub.includes('women')) continue;
    const images = (p.images || []).filter(Boolean);
    if (!images.length) continue;
    const existing = await prisma.product.findFirst({
      where: { slug: p.slug },
      select: { id: true },
    });
    if (!existing) continue;
    await prisma.product.update({ where: { id: existing.id }, data: { images } });
    const variants = await prisma.productVariant.findMany({
      where: { productId: existing.id },
    });
    for (const v of variants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { images: [images[0], images[1] || images[0]].filter(Boolean) },
      });
    }
    n += 1;
  }
  console.log('db women images updated', n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
