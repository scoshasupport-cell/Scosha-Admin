/**
 * Push furniture (curtain) prices from storefront products.json into MySQL.
 */
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');

async function main() {
  const products = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../src/data/products.json'), 'utf8'),
  );
  let n = 0;
  for (const p of products) {
    if (p.category !== 'furniture') continue;
    const existing = await prisma.product.findFirst({
      where: { slug: p.slug },
      select: { id: true },
    });
    if (!existing) continue;
    const price = Number(p.price);
    const compareAt = p.compareAt != null ? Number(p.compareAt) : null;
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        basePrice: price,
        comparePrice: compareAt,
        badge: p.badge || null,
      },
    });
    await prisma.productVariant.updateMany({
      where: { productId: existing.id },
      data: {
        price,
        comparePrice: compareAt,
      },
    });
    n += 1;
  }
  console.log('db furniture prices updated', n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
