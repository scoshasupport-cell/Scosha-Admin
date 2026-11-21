const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({
  datasources: { db: { url: "mysql://scosha:scosha123@localhost:3306/scosha" } },
});
(async () => {
  const winter = await p.product.findMany({
    where: { status: "active", slug: { contains: "pup-clo" } },
    take: 8,
    orderBy: { basePrice: "desc" },
    select: { name: true, slug: true, basePrice: true, images: true },
  });
  const curt = await p.product.findMany({
    where: {
      status: "active",
      OR: [{ slug: { contains: "pup-fur" } }, { name: { contains: "Curtain" } }],
    },
    take: 8,
    orderBy: { basePrice: "desc" },
    select: { name: true, slug: true, basePrice: true, images: true },
  });
  const out = {
    winter: winter.map((x) => ({
      name: String(x.name).slice(0, 60),
      slug: x.slug,
      price: Number(x.basePrice),
      img: Array.isArray(x.images) ? x.images[0] : null,
    })),
    curtain: curt.map((x) => ({
      name: String(x.name).slice(0, 60),
      slug: x.slug,
      price: Number(x.basePrice),
      img: Array.isArray(x.images) ? x.images[0] : null,
    })),
  };
  console.log(JSON.stringify(out, null, 2));
  await p.$disconnect();
})();
