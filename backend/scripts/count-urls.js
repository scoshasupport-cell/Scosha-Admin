const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
(async()=>{
  const products=await p.product.findMany({select:{images:true,variants:{select:{images:true}}}});
  const urls=new Set();
  for (const prod of products) {
    for (const u of (prod.images||[])) if (String(u).startsWith("http")) urls.add(String(u));
    for (const v of prod.variants||[]) for (const u of (v.images||[])) if (String(u).startsWith("http")) urls.add(String(u));
  }
  console.log("uniqueHttpUrls", urls.size);
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1)});
