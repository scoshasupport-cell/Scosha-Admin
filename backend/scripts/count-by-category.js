const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({
  datasources: { db: { url: "mysql://scosha:scosha123@localhost:3306/scosha" } },
});
(async () => {
  const rows = await p.$queryRawUnsafe(`
    SELECT c.name, c.slug, COUNT(*) AS n
    FROM products p
    JOIN categories c ON c.id = p.categoryId
    WHERE p.status = 'active'
    GROUP BY c.id
    ORDER BY n DESC
  `);
  console.log(JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? Number(v) : v), 2));
  await p.$disconnect();
})();
