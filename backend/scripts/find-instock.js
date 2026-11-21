const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
(async()=>{
  const v=await p.productVariant.findFirst({
    where:{ stock:{ gt:0 }, status:"active", product:{ status:"active" } },
    include:{ product:true },
  });
  console.log(JSON.stringify({
    slug:v?.product?.slug,
    name:v?.product?.name,
    size:v?.size,
    stock:v?.stock,
    price:v?.price,
    img:v?.product?.images?.[0],
    variantId:v?.id,
  },null,2));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1)});
