/** Re-bake productType fields in demo-catalog.json using lib/product-types rules. */
import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const catalogPath = path.join(root, "lib", "demo-catalog.json")

// Compile TS module via next/tsx isn't available — duplicate minimal call through dynamic import of built logic:
// Use child process with npx tsx instead when run from npm. Here we inline apply via eval of copied map.
const require = createRequire(import.meta.url)

async function main() {
  const { enrichProductTyping, resolveChannel } = await import("../lib/product-types.ts").catch(async () => {
    // fallback: spawn note
    throw new Error("Run with: npx tsx scripts/enrich-demo-product-types.mjs")
  })

  const data = JSON.parse(fs.readFileSync(catalogPath, "utf8"))
  const counts = {}
  for (const p of data) {
    delete p.productType
    delete p.productTypeSlug
    const e = enrichProductTyping(p)
    p.subCategorySlug = e.subCategorySlug
    p.gender = e.gender
    p.productType = e.productType
    p.productTypeSlug = e.productTypeSlug
    const ch = resolveChannel(e)
    const key = `${ch} / ${e.productTypeSlug}`
    counts[key] = (counts[key] || 0) + 1
  }
  fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2) + "\n")
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`${n}\t${k}`))
  const cardigans = data.filter((p) => p.productTypeSlug === "cardigans")
  console.log("\nCardigans now:")
  cardigans.forEach((p) => console.log("-", p.id, p.title.slice(0, 70)))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
