import { readFileSync, writeFileSync } from "node:fs"
import { join, extname } from "node:path"

const ROOT = "E:/scotcha-main"
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }

function extFrom(url) {
  const ext = extname(url.split("?")[0]).toLowerCase()
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg"
}

async function download(url, dest) {
  const sized = `${url.split("&width=")[0]}${url.includes("?") ? "&" : "?"}width=900`
  const res = await fetch(sized, { headers: HEADERS })
  if (!res.ok) throw new Error(`dl ${res.status} ${url}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

const html = await fetch("https://looliacloset.com/", { headers: HEADERS }).then((r) => r.text())
const re = /href="\/products\/([a-z0-9-]+)"/gi
function between(a, b) {
  return [...new Set([...html.slice(html.indexOf(a), html.indexOf(b)).matchAll(re)].map((m) => m[1]))]
}

const rails = {
  featured: between("featured_collection_w8ayYj", "featured_collection_RgakPF"),
  deals: between("featured_collection_RgakPF", "slideshow_HEaYDh"),
  makeup: between("featured_collection_g7KTTp", "slideshow_q3U4Jn").slice(0, 12),
  dermo: between("featured_collection_iyteJK", "slideshow_APQa7J").slice(0, 8),
  haircare: between("featured_collection_GJx7RT", "slideshow_3krxg7").slice(0, 8),
  skincare: between("featured_collection_9WeK3d", "slideshow_qttBCq").slice(0, 8),
  fragrances: between("featured_collection_LcBTEW", "shopify-section-footer").slice(0, 8),
}

writeFileSync(join(ROOT, "lib/home-rails.json"), JSON.stringify(rails, null, 2))
console.log(Object.fromEntries(Object.entries(rails).map(([k, v]) => [k, v.length])))

const existing = JSON.parse(readFileSync(join(ROOT, "lib/catalog.json"), "utf8"))
const byHandle = new Map(existing.map((p) => [p.handle, p]))
const needed = [...new Set(Object.values(rails).flat())]
let nextId = existing.length + 1

for (const handle of needed) {
  if (byHandle.has(handle)) continue
  const res = await fetch(`https://looliacloset.com/products/${handle}.js`, { headers: HEADERS })
  if (!res.ok) {
    console.log("skip", handle, res.status)
    continue
  }
  const raw = await res.json()
  const src = raw.featured_image || raw.images?.[0]
  const imageUrl = typeof src === "string" ? (src.startsWith("//") ? "https:" + src : src) : src?.src
  if (!imageUrl) continue
  const file = `${handle}${extFrom(imageUrl)}`
  await download(imageUrl.replace(/^\/\//, "https:"), join(ROOT, "public/products", file))
  const variants = (raw.variants || []).slice(0, 8).map((variant) => ({
    id: String(variant.id),
    title: variant.title === "Default Title" ? "Default" : variant.title,
    inStock: variant.available !== false && (variant.inventory_quantity == null || variant.inventory_quantity > 0),
    price: Number(variant.price) / (Number(variant.price) > 200 ? 100 : 1),
  }))
  // Shopify .js prices are often in cents
  const priceVal = Number(raw.price)
  const price = priceVal > 200 ? priceVal / 100 : priceVal
  const compareVal = raw.compare_at_price ? Number(raw.compare_at_price) : 0
  const compare = compareVal > 200 ? compareVal / 100 : compareVal
  const type = `${raw.type || ""} ${raw.tags || ""} ${raw.title}`.toLowerCase()
  let category = "Makeup"
  if (/fragrance|perfume|edp|edt/.test(type)) category = "Fragrances"
  else if (/hair/.test(type)) category = "Haircare"
  else if (/tool|brush/.test(type)) category = "Tools"
  else if (/skin|dermo|cream|serum|spf/.test(type)) category = "Skincare"
  const product = {
    id: `p${nextId++}`,
    title: raw.title,
    handle,
    brand: raw.vendor || "Scosha",
    category,
    subCategory: "Face",
    concerns: [],
    isLuxury: /armani|ysl|lancôme|lancome|valentino|mugler|dior/i.test(raw.vendor || ""),
    isDermoCosmetic: /la roche|cerave|bioderma|avène|avene|vichy|ducray/i.test(raw.vendor || ""),
    price,
    compareAtPrice: compare > price ? compare : undefined,
    currency: "USD",
    images: [`/products/${file}`],
    rating: 4.6,
    reviewCount: 400,
    variants: variants.length
      ? variants.map((variant) => ({
          ...variant,
          price: variant.price > 200 ? variant.price / 100 : variant.price,
        }))
      : [{ id: `${raw.id}-1`, title: "Default", inStock: true, price }],
  }
  byHandle.set(handle, product)
  console.log("added", handle, product.price, product.brand)
}

const preferred = needed.map((h) => byHandle.get(h)).filter(Boolean)
const rest = [...byHandle.values()].filter((p) => !needed.includes(p.handle))
const merged = [...preferred, ...rest].map((p, i) => ({ ...p, id: `p${i + 1}` }))
writeFileSync(join(ROOT, "lib/catalog.json"), JSON.stringify(merged, null, 2))
console.log("catalog", merged.length)
