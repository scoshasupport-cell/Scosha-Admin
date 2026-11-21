const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
(async()=>{
  const r=await p.product.updateMany({
    where:{ status:{ not:"active" } },
    data:{ status:"active" },
  });
  const v=await p.productVariant.updateMany({
    where:{ status:{ not:"active" } },
    data:{ status:"active" },
  });
  console.log(JSON.stringify({
    productsActivated:r.count,
    variantsActivated:v.count,
    activeProducts:await p.product.count({where:{status:"active"}}),
    activeVariants:await p.productVariant.count({where:{status:"active"}}),
  }));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1)});
