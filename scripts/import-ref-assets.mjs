import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs"
import { join, extname } from "node:path"

const ROOT = "E:/scotcha-main"
const PUBLIC = join(ROOT, "public")
const PRODUCT_DIR = join(PUBLIC, "products")
const BANNER_DIR = join(PUBLIC, "banners")
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
}

mkdirSync(PRODUCT_DIR, { recursive: true })
mkdirSync(BANNER_DIR, { recursive: true })

function abs(url) {
  if (!url) return ""
  return url.replaceAll("&amp;", "&").replace(/^\/\//, "https://")
}

function shopifySized(url, width) {
  const clean = abs(url).split("&width=")[0]
  return `${clean}${clean.includes("?") ? "&" : "?"}width=${width}`
}

function extFrom(url) {
  const path = abs(url).split("?")[0]
  const ext = extname(path).toLowerCase()
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg"
}

async function getText(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function download(url, dest) {
  const res = await fetch(shopifySized(url, url.includes("/files/") && dest.includes("banners") ? 2000 : 900), {
    headers: HEADERS,
  })
  if (!res.ok) throw new Error(`download ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
}

async function pool(items, limit, worker) {
  const out = []
  let i = 0
  async function run() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await worker(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return out
}

function mapHref(href) {
  if (!href) return "/shop"
  const path = href.split("?")[0]
  if (path.includes("nyx")) return "/shop?brand=NYX Professional Makeup"
  if (path.includes("makeup")) return "/shop?category=Makeup"
  if (path.includes("skin")) return "/shop?category=Skincare"
  if (path.includes("hair")) return "/shop?category=Haircare"
  if (path.includes("fragrance")) return "/shop?category=Fragrances"
  if (path.includes("k-beauty") || path.includes("kbeauty")) return "/shop?category=K-Beauty"
  if (path.startsWith("/collections/")) {
    const handle = path.replace("/collections/", "").split("/")[0]
    return `/shop?q=${encodeURIComponent(handle.replaceAll("-", " "))}`
  }
  return "/shop"
}

function mapCategory(product) {
  const hay = `${product.product_type} ${(product.tags || []).join(" ")} ${product.title}`.toLowerCase()
  if (/fragrance|perfume|edp|edt|parfum|cologne/.test(hay)) return "Fragrances"
  if (/k-beauty|k beauty|korean/.test(hay)) return "K-Beauty"
  if (/hair/.test(hay)) return "Haircare"
  if (/tool|brush|sponge|curler/.test(hay)) return "Tools"
  if (/makeup|lip|eye|mascara|foundation|concealer|blush|liner|powder|primer|gloss|lipstick/.test(hay)) return "Makeup"
  if (/skin|dermo|serum|cream|cleanser|moistur|spf|sunscreen|toner/.test(hay)) return "Skincare"
  const type = (product.product_type || "").toLowerCase()
  if (type.includes("makeup")) return "Makeup"
  if (type.includes("skin")) return "Skincare"
  return "Makeup"
}

function mapSub(product, category) {
  const hay = `${product.product_type} ${product.title}`.toLowerCase()
  if (category === "Makeup") {
    if (/lip|gloss|lipstick|balm/.test(hay)) return "Lips"
    if (/eye|mascara|liner|brow/.test(hay)) return "Eyes"
    if (/nail/.test(hay)) return "Nails"
    return "Face"
  }
  if (category === "Haircare") {
    if (/tool|dryer|straight/.test(hay)) return "Tools"
    if (/mask|serum|oil|treatment/.test(hay)) return "Treatment"
    return "Cleanse"
  }
  if (category === "Fragrances") {
    if (/toilette/.test(hay)) return "EDT"
    if (/parfum/.test(hay)) return "Parfum"
    return "EDP"
  }
  return "Face"
}

const LUXURY = /ysl|yves saint laurent|lancôme|lancome|estée|estee lauder|giorgio armani|valentino|mugler|dior|chanel|anastasia beverly hills/i
const DERMO = /la roche|cerave|bioderma|avène|avene|vichy|ducray|eucerin|uriage|svr|mustela|mixa/i

function hidden(product) {
  const tags = (product.tags || []).join(",").toLowerCase()
  return (
    tags.includes("gwp") ||
    tags.includes("hidden") ||
    tags.includes("searchanise_ignore") ||
    product.product_type === "GWP" ||
    /gift from/i.test(product.title)
  )
}

function toProduct(raw, index, imagePath) {
  const variants = (raw.variants || []).slice(0, 8).map((variant) => ({
    id: String(variant.id),
    title: variant.title === "Default Title" ? "Default" : variant.title,
    inStock: Boolean(variant.available),
    price: Number(variant.price),
  }))
  const prices = variants.map((variant) => variant.price)
  const price = prices.length ? Math.min(...prices) : Number(raw.variants?.[0]?.price || 0)
  const compare = raw.variants?.map((variant) => Number(variant.compare_at_price)).filter((n) => n > price)
  const category = mapCategory(raw)
  return {
    id: `p${index + 1}`,
    title: raw.title,
    handle: raw.handle,
    brand: raw.vendor || "Scosha",
    category,
    subCategory: mapSub(raw, category),
    concerns: [],
    isLuxury: LUXURY.test(raw.vendor || ""),
    isDermoCosmetic: DERMO.test(raw.vendor || "") || /dermo/i.test((raw.tags || []).join(" ")),
    price,
    compareAtPrice: compare?.length ? Math.min(...compare) : undefined,
    currency: "USD",
    images: [imagePath],
    rating: 4.6,
    reviewCount: 120 + ((raw.id || 0) % 1800),
    variants: variants.length ? variants : [{ id: `${raw.id}-1`, title: "Default", inStock: true, price }],
  }
}

const html = await getText("https://looliacloset.com/")

const firstSlideshow = html.slice(
  html.indexOf("slideshow_VjAmHX"),
  html.indexOf("image_cards_3CrhGr"),
)
const heroSlides = []
for (const block of firstSlideshow.split('class="swiper-slide"').slice(1)) {
  const href = block.match(/<a href="([^"]+)"/)?.[1] || "/shop"
  const img = block.match(/<img src="(\/\/looliacloset\.com\/cdn\/shop\/files\/[^"]+)"/)?.[1]
  if (img) heroSlides.push({ href: mapHref(href), src: abs(img) })
}

const promoSets = []
const cardRe = /id="shopify-section-template--20040902901838__image_cards_[^"]+"[\s\S]*?<\/section>/g
let cardMatch
while ((cardMatch = cardRe.exec(html))) {
  const section = cardMatch[0]
  const banners = []
  const cardBlocks = [...section.matchAll(/<a\s+href="([^"]+)"[\s\S]*?<img src="(\/\/looliacloset\.com\/cdn\/shop\/files\/[^"]+)"/g)]
  for (const [, href, src] of cardBlocks.slice(0, 4)) {
    banners.push({ href: mapHref(href), src: abs(src) })
  }
  if (banners.length === 4) promoSets.push(banners)
}

const homepageHandles = [...html.matchAll(/href="\/products\/([a-z0-9-]+)"/gi)].map((m) => m[1])
const featuredHandles = [...new Set(homepageHandles)]

async function collectionProducts(handle, limit = 50) {
  const pages = Math.ceil(limit / 30)
  const all = []
  for (let page = 1; page <= pages; page++) {
    const data = await getJson(`https://looliacloset.com/collections/${handle}/products.json?limit=30&page=${page}`)
    const products = data.products || []
    all.push(...products)
    if (products.length < 30) break
  }
  return all.slice(0, limit)
}

const [featured, makeup, nyx, skin, hair, fragrance] = await Promise.all([
  collectionProducts("featured-products", 24),
  collectionProducts("makeup", 40),
  collectionProducts("nyx-professional-makeup", 24),
  collectionProducts("skin-care", 24),
  collectionProducts("haircare", 18),
  collectionProducts("fragrances", 18),
])

const byHandle = new Map()
for (const product of [...featured, ...makeup, ...nyx, ...skin, ...hair, ...fragrance]) {
  if (!product?.handle || hidden(product) || byHandle.has(product.handle)) continue
  if (!product.images?.[0]?.src) continue
  byHandle.set(product.handle, product)
}

const ordered = []
for (const handle of featuredHandles) {
  if (byHandle.has(handle)) ordered.push(byHandle.get(handle))
}
for (const product of byHandle.values()) {
  if (!ordered.includes(product)) ordered.push(product)
}

const catalog = ordered.slice(0, 96)

console.log("hero", heroSlides.length, "promo sets", promoSets.length, "products", catalog.length)

for (const file of readdirSync(BANNER_DIR)) rmSync(join(BANNER_DIR, file))
for (const file of readdirSync(PRODUCT_DIR)) rmSync(join(PRODUCT_DIR, file))

const heroFiles = []
await pool(heroSlides, 4, async (slide, i) => {
  const file = `hero-${i + 1}${extFrom(slide.src)}`
  await download(slide.src, join(BANNER_DIR, file))
  heroFiles[i] = { ...slide, file: `/banners/${file}` }
  console.log("banner", file)
})

const promoFiles = []
for (let s = 0; s < promoSets.length; s++) {
  const setFiles = []
  await pool(promoSets[s], 4, async (banner, i) => {
    const file = `promo-${s + 1}-${i + 1}${extFrom(banner.src)}`
    await download(banner.src, join(BANNER_DIR, file))
    setFiles[i] = { ...banner, file: `/banners/${file}` }
    console.log("promo", file)
  })
  promoFiles.push(setFiles)
}

const products = []
await pool(catalog, 6, async (raw, i) => {
  const src = raw.images[0].src
  const file = `${raw.handle}${extFrom(src)}`
  await download(src, join(PRODUCT_DIR, file))
  products[i] = toProduct(raw, i, `/products/${file}`)
  if (i % 10 === 0) console.log("product", i + 1, raw.handle)
})

writeFileSync(join(ROOT, "lib/catalog.json"), JSON.stringify(products, null, 2))

const heroTs = `export type HeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  gradient: string;
  imageSrc?: string;
  contentAlign?: "left" | "right";
};

export const heroSlides: HeroSlide[] = ${JSON.stringify(
  heroFiles.map((slide, i) => ({
    id: `slide-${i + 1}`,
    title: "Shop Now",
    ctaText: "Shop Now",
    ctaHref: slide.href,
    gradient: "linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 60%, #F48FB1 100%)",
    imageSrc: slide.file,
  })),
  null,
  2,
)};
`

writeFileSync(join(ROOT, "lib/hero-data.ts"), heroTs)

const promoTs = `export type PromoBanner = {
  id: string;
  brand: string;
  line: string;
  href: string;
  gradient: string;
  imageSrc?: string;
};

export type PromoGridSet = {
  id: string;
  banners: [PromoBanner, PromoBanner, PromoBanner, PromoBanner];
};

export const promoGridSets: PromoGridSet[] = ${JSON.stringify(
  promoFiles.map((set, s) => ({
    id: `set-${s + 1}`,
    banners: set.map((banner, i) => ({
      id: `b${s + 1}-${i + 1}`,
      brand: "",
      line: "",
      href: banner.href,
      gradient: "linear-gradient(135deg,#F3E5F5,#E1BEE7)",
      imageSrc: banner.file,
    })),
  })),
  null,
  2,
)};
`

writeFileSync(join(ROOT, "lib/promo-grid-data.ts"), promoTs)

writeFileSync(
  join(ROOT, "lib/products.ts"),
  `import type { Product } from "@/types/ecommerce"
import catalog from "@/lib/catalog.json"

export const PRODUCTS: Product[] = catalog as Product[]

export function getProduct(handle: string): Product | undefined {
  return PRODUCTS.find((p) => p.handle === handle)
}

export function getProductsByIds(ids: string[]): Product[] {
  return ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as Product[]
}
`,
)

console.log("done", products.length)
