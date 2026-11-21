/**
 * Sync cleaned product.details into DB (strip import metadata).
 */
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');

function clean(details) {
  return (details || []).filter((d) => {
    const t = String(d || '').trim();
    const low = t.toLowerCase();
    if (!t) return false;
    if (low.startsWith('source:')) return false;
    if (low.startsWith('stock qty from sheet')) return false;
    if (low.startsWith('price source:')) return false;
    return true;
  });
}

async function main() {
  const products = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../src/data/products.json'), 'utf8'),
  );
  let n = 0;
  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { slug: p.slug },
      select: { id: true, details: true },
    });
    if (!existing) continue;
    const next = clean(p.details || existing.details || []);
    await prisma.product.update({ where: { id: existing.id }, data: { details: next } });
    n += 1;
  }
  console.log('details cleaned in db', n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
