/** Remove Source URL / Amazon URL keys from product.specs in Scosha DB. */
const path = require("path")
const { PrismaClient } = require("@prisma/client")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

const HIDDEN = /^(source\s*url|source|amazon\s*url|external\s*url|sheet\s*size|sheet\s*group)$/i
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.product.findMany({ select: { id: true, specs: true } })
  let removed = 0
  let updated = 0
  for (const r of rows) {
    if (!r.specs || typeof r.specs !== "object" || Array.isArray(r.specs)) continue
    const next = { ...r.specs }
    let changed = false
    for (const k of Object.keys(next)) {
      if (HIDDEN.test(String(k).trim())) {
        delete next[k]
        removed += 1
        changed = true
      }
    }
    if (changed) {
      await prisma.product.update({ where: { id: r.id }, data: { specs: next } })
      updated += 1
    }
  }
  console.log({ updated, removed })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
