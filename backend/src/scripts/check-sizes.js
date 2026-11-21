const { prisma } = require('../config/prisma');

async function main() {
  const clothes = await prisma.product.findMany({
    where: { status: 'active', category: { slug: 'clothes' } },
    take: 40,
    include: {
      variants: { select: { size: true } },
      subCategory: true,
    },
  });

  const apparel = clothes.filter((c) => {
    const s = String(c.subCategory?.slug || '');
    return !s.includes('shoe') && !s.includes('bag');
  });

  for (const c of apparel.slice(0, 6)) {
    const sizes = [...new Set(c.variants.map((v) => v.size))];
    console.log(c.subCategory?.slug || '-', c.slug.slice(0, 40), sizes.join(','));
  }
  console.log('apparel checked', apparel.length, 'of', clothes.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
