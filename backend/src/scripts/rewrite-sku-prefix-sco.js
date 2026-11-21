/** Rewrite product specs.SKU prefixes PUP-/AMA- → SCO- in Scosha DB. */
const path = require("path")
const { PrismaClient } = require("@prisma/client")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

const prisma = new PrismaClient()

function toScoSku(sku) {
  return String(sku || "").replace(/^(PUP|AMA)-/i, "SCO-")
}

async function main() {
  const rows = await prisma.product.findMany({ select: { id: true, specs: true } })
  let updated = 0
  for (const r of rows) {
    if (!r.specs || typeof r.specs !== "object" || Array.isArray(r.specs)) continue
    const current = r.specs.SKU
    if (!current) continue
    const next = toScoSku(current)
    if (next === current) continue
    await prisma.product.update({
      where: { id: r.id },
      data: { specs: { ...r.specs, SKU: next } },
    })
    updated += 1
  }
  console.log({ updated })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
