require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const r = await p.product.updateMany({ data: { status: "active" } });
  console.log("activated", r.count);
  console.log(await p.product.groupBy({ by: ["status"], _count: true }));
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
