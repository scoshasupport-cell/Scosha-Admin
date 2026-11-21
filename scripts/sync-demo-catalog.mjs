/**
 * Pull all active products from Scosha API into lib/demo-catalog.json
 * so mobile/offline fallback shows the full catalog (not a tiny subset).
 *
 * Usage: node scripts/sync-demo-catalog.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, "../lib/demo-catalog.json")
const API = process.env.SCOSHA_API || "http://127.0.0.1:5000/api/v1"

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.products)) return payload.products
  return []
}

function imgUrl(img) {
  if (!img) return ""
  if (typeof img === "string") return img
  return img.url || img.src || ""
}

function mapProduct(p) {
  const variantsRaw = (p.variants || []).filter((v) => v.status !== "inactive")
  const images = (p.images || []).map(imgUrl).filter(Boolean)
  const slug = String(p.slug || "").replace(/-(ama|pup)-/gi, "-sco-")
  const brand =
    typeof p.brand === "string" ? p.brand : p.brand?.name || "Scosha"
  const category =
    typeof p.category === "string" ? p.category : p.category?.name || "Clothes"
  const categorySlug =
    (typeof p.category === "object" && p.category?.slug) ||
    String(category).toLowerCase().replace(/\s+/g, "-")
  const sub =
    p.subcategory?.name || p.subCategory?.name || p.subCategory || ""
  const subSlug =
    p.subcategory?.slug ||
    p.subCategorySlug ||
    String(sub || "")
      .toLowerCase()
      .replace(/\s+/g, "-")

  const sizes = [
    ...new Set(variantsRaw.map((v) => v.size).filter(Boolean)),
  ]
  const colors = []
  const colorSeen = new Set()
  for (const v of variantsRaw) {
    const name = v.colorName || v.color?.name || "Default"
    if (colorSeen.has(name)) continue
    colorSeen.add(name)
    const vImgs = (v.images || []).map(imgUrl).filter(Boolean)
    const merged = [...(vImgs.length ? vImgs : images)]
    colors.push({
      name,
      hex: v.colorHex || v.color?.hex || "#888888",
      image: merged[0] || "",
      image2: merged[1] || merged[0] || "",
      images: merged,
    })
  }
  if (!colors.length) {
    colors.push({
      name: "Default",
      hex: "#111111",
      image: images[0] || "",
      image2: images[1] || images[0] || "",
      images,
    })
  }

  const variants = variantsRaw.map((v) => {
    const stock = Math.max(0, Number(v.stock) || 0)
    const color = v.colorName || v.color?.name || "Default"
    return {
      id: String(v.id),
      title: [color, v.size].filter(Boolean).join(" / ") || "Default",
      size: v.size,
      colorName: color,
      shadeHex: v.colorHex || v.color?.hex || "#888888",
      inStock: stock > 0,
      stock,
      price: Number(v.price ?? p.basePrice),
    }
  })

  const stockTotal = variants.reduce((s, v) => s + v.stock, 0)

  return {
    id: String(p.id),
    title: String(p.name || "")
      .replace(/pupasita\s*/gi, "")
      .replace(/\bAMA\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
    handle: slug,
    brand: brand === "Amaz" || brand === "AMAZ" ? "Scosha" : brand,
    category,
    categorySlug,
    subCategory: sub || undefined,
    subCategorySlug: subSlug || undefined,
    department: categorySlug,
    price: Number(p.basePrice),
    compareAtPrice:
      p.comparePrice != null ? Number(p.comparePrice) : undefined,
    stock: stockTotal,
    inStock: variants.length
      ? variants.some((v) => v.inStock)
      : p.status !== "archived",
    currency: "USD",
    images: images.length ? images : colors.map((c) => c.image).filter(Boolean),
    variants,
    colors,
    sizes: sizes.length ? sizes : ["One Size"],
    description: String(p.description || "")
      .replace(/pupasita\s*/gi, "")
      .trim(),
    details: Array.isArray(p.details) ? p.details : [],
    specs: p.specs && typeof p.specs === "object" ? p.specs : {},
    rating: p.ratingAvg ?? 0,
    reviewCount: p.reviewCount ?? 0,
    badge: p.badge ?? undefined,
    createdAt: p.createdAt,
  }
}

const res = await fetch(`${API}/products?limit=500&status=active`)
if (!res.ok) {
  console.error("API failed", res.status, await res.text())
  process.exit(1)
}
const json = await res.json()
const raw = asList(json.data !== undefined ? json : json)
const products = raw.map(mapProduct)
fs.writeFileSync(outPath, JSON.stringify(products, null, 2) + "\n")
console.log(`Wrote ${products.length} products → ${outPath}`)
