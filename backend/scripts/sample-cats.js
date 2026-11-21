const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({
  datasources: { db: { url: "mysql://scosha:scosha123@localhost:3306/scosha" } },
});
(async () => {
  const cats = await p.category.findMany({
    select: { name: true, slug: true, image: true },
  });
  const curtains = await p.product.findMany({
    where: {
      status: "active",
      AND: [
        { images: { not: null } },
        {
          OR: [
            { name: { contains: "Curtain" } },
            { name: { contains: "curtain" } },
            { slug: { contains: "curtain" } },
          ],
        },
      ],
    },
    take: 6,
    select: { name: true, slug: true, basePrice: true, images: true },
  });
  const shoes = await p.product.findMany({
    where: {
      status: "active",
      OR: [{ name: { contains: "Boot" } }, { name: { contains: "Shoe" } }, { slug: { contains: "boot" } }],
    },
    take: 3,
    select: { name: true, slug: true, images: true, basePrice: true },
  });
  console.log(
    JSON.stringify(
      {
        cats,
        curtains: curtains.map((x) => ({
          name: String(x.name).slice(0, 50),
          slug: x.slug,
          price: Number(x.basePrice),
          img: x.images?.[0],
        })),
        shoes: shoes.map((x) => ({
          name: String(x.name).slice(0, 50),
          slug: x.slug,
          price: Number(x.basePrice),
          img: x.images?.[0],
        })),
      },
      null,
      2,
    ),
  );
  await p.$disconnect();
})();
