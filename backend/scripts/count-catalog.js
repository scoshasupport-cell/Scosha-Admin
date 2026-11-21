const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const out = {
    products: await p.product.count(),
    variants: await p.productVariant.count(),
    categories: await p.category.count(),
    brands: await p.brand.count(),
    collections: await p.collection.count(),
  };
  console.log(JSON.stringify(out));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
