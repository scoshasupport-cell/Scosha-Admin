const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');

const PRODUCTS = path.resolve(__dirname, '../../../src/data/products.json');
const order = ['barra1', 'barra2', 'barr3', 'barra4', 'barra5'];

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
  const p = products.find((x) => (x.specs?.SKU || x.id) === 'PUP-CLO-053');
  const urls = p.images || [];
  const sorted = order.map((key) => urls.find((u) => u.toLowerCase().includes(key))).filter(Boolean);
  for (const u of urls) if (!sorted.includes(u)) sorted.push(u);
  p.images = sorted;
  p.image = sorted[0];
  p.image2 = sorted[1] || sorted[0];
  if (p.colors?.[0]) {
    p.colors[0].image = sorted[0];
    p.colors[0].image2 = sorted[1] || sorted[0];
  }
  fs.writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + '\n');
  const row = await prisma.product.findFirst({ where: { slug: p.slug } });
  if (row) await prisma.product.update({ where: { id: row.id }, data: { images: sorted } });
  console.log(
    'ok',
    sorted.map((u) => u.split('/').pop()),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
