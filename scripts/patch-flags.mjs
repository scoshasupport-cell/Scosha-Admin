import { readFileSync, writeFileSync } from "node:fs"

const path = "E:/scotcha-main/lib/catalog.json"
const products = JSON.parse(readFileSync(path, "utf8"))
const dermo = /la roche|cerave|bioderma|avène|avene|vichy|ducray|mustela|mixa|eucerin|uriage|svr|bepanthen/i
const luxury = /ysl|yves saint laurent|lancôme|lancome|estée|estee|armani|valentino|mugler|dior|chanel|anastasia/i
const kbeauty = /skin1004|eqqualberry|cosrx|beauty of joseon|anua|round lab|some by mi/i

for (const product of products) {
  product.isDermoCosmetic = dermo.test(product.brand)
  product.isLuxury = luxury.test(product.brand)
  if (kbeauty.test(product.brand) || kbeauty.test(product.title)) product.category = "K-Beauty"
}

writeFileSync(path, JSON.stringify(products, null, 2))
console.log("dermo", products.filter((p) => p.isDermoCosmetic).length)
