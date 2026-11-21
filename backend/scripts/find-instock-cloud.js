const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
(async()=>{
  const rows=await p.$queryRawUnsafe(`
    SELECT p.slug, p.name, CAST(p.images AS CHAR) AS images, v.id AS variantId, v.size, v.stock, v.price
    FROM products p
    JOIN product_variants v ON v.productId = p.id
    WHERE v.stock > 0 AND p.status='active' AND CAST(p.images AS CHAR) LIKE '%scosha/products%'
    LIMIT 5
  `);
  console.log(JSON.stringify(rows,null,2));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1)});
