require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const groups = await p.product.groupBy({ by: ["status"], _count: true });
  console.log("before", groups);

  // Make full Amaz catalog shoppable on Scosha (exclude archived only)
  const r = await p.product.updateMany({
    where: { status: { not: "archived" } },
    data: { status: "active" },
  });
  console.log("activated", r.count);

  const after = await p.product.groupBy({ by: ["status"], _count: true });
  console.log("after", after);

  const cloud = await p.product.findMany({
    where: { images: { string_contains: "cloudinary" } },
  }).catch(() => null);

  // Prisma MySQL JSON filter varies — use raw
  const [cloudRow] = await p.$queryRawUnsafe(
    "SELECT COUNT(*) AS c FROM products WHERE CAST(images AS CHAR) LIKE '%res.cloudinary.com%'",
  );
  console.log("cloudinaryProducts", Number(cloudRow.c));

  const sampleCloud = await p.$queryRawUnsafe(
    "SELECT name, slug, CAST(images AS CHAR) AS images FROM products WHERE CAST(images AS CHAR) LIKE '%res.cloudinary.com%' LIMIT 3",
  );
  console.log("sampleCloud", sampleCloud);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
