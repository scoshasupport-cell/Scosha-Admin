/**
 * Product-type subcategories derived from catalog titles.
 * Used under Women / Men / Kids / Shoes / Accessories / Home.
 */

export type MainChannel = "women" | "men" | "kids" | "shoes" | "accessories" | "home" | "clothes"

export interface ProductTypeDef {
  slug: string
  label: string
  patterns: RegExp[]
  /** Higher wins when several types match the same title. */
  weight?: number
}

/**
 * Manual fixes when marketplace titles don't match the real garment
 * (product id or handle → type slug).
 */
export const PRODUCT_TYPE_OVERRIDES: Record<string, string> = {
  // Title says "Knit Cardigan" but image is a crewneck pullover
  "1358": "knitwear",
  // Truncated "Flight" listing is a bag
  "1313": "bags",
}

export const PRODUCT_TYPES: ProductTypeDef[] = [
  { slug: "boots", label: "Boots", weight: 12, patterns: [/\bboots?\b/i, /\bchelsea\b/i, /\bcombat\b/i, /\bchukka\b/i, /\bankle\s*boots?\b/i] },
  { slug: "loafers", label: "Loafers", weight: 12, patterns: [/\bloafers?\b/i, /\bpenny\s*loafer/i] },
  { slug: "heels", label: "Heels & Dance", weight: 11, patterns: [/\bheels?\b/i, /\bballroom\b/i, /\bdance\s*shoes?\b/i, /\blatin\b/i, /\bsalsa\b/i] },
  { slug: "sandals", label: "Sandals", weight: 11, patterns: [/\bsandals?\b/i] },
  { slug: "flats", label: "Flats & Ballet", weight: 10, patterns: [/\bballet\b/i, /\bflat\s*shoes?\b/i, /\bballerina\b/i] },
  { slug: "sneakers", label: "Sneakers & Trainers", weight: 10, patterns: [/\bsneakers?\b/i, /\btrainers?\b/i, /\brunning\s*shoes?\b/i, /\bgym\b.{0,24}\bshoes?\b/i, /\btennis\s*shoes?\b/i, /\bwalking\s*sneakers?\b/i] },

  { slug: "bags", label: "Bags & Purses", weight: 12, patterns: [/\bbackpack\b/i, /\bhandbag\b/i, /\bpurse\b/i, /\bshoulder\s*bag\b/i, /\bcrossbody\b/i, /\bbag\b/i] },
  { slug: "gloves", label: "Gloves", weight: 12, patterns: [/\bgloves?\b/i] },

  { slug: "sets", label: "Sets & Suits", weight: 14, patterns: [/\b2[\s-]?piece\b/i, /\btracksuit\b/i, /\btuxedo\b/i, /\bsuit\s*set\b/i] },
  { slug: "sets", label: "Sets & Suits", weight: 9, patterns: [/\bsuit\b/i, /\bset\b/i] },

  { slug: "coats", label: "Coats & Trench", weight: 11, patterns: [/\btrench\b/i, /\bovercoat\b/i, /\bparka\b/i, /\bcoats?\b/i] },
  { slug: "jackets", label: "Jackets", weight: 11, patterns: [/\bjacket\b/i, /\bwindbreaker\b/i, /\bbomber\b/i, /\bvarsity\b/i, /\brain\s*jacket\b/i] },
  { slug: "hoodies", label: "Hoodies & Sweatshirts", weight: 12, patterns: [/\bhoodie\b/i, /\bsweatshirt\b/i, /\bpullover\b/i, /\bcrew\s*neck\b/i] },
  { slug: "vests", label: "Vests & Waistcoats", weight: 11, patterns: [/\bwaistcoat\b/i, /\bgilet\b/i, /\bquilted\s*vest\b/i, /\bvest\b/i] },
  { slug: "blazers", label: "Blazers", weight: 11, patterns: [/\bblazer\b/i] },

  { slug: "cardigans", label: "Cardigans", weight: 10, patterns: [/\bcardigans?\b/i] },
  { slug: "knitwear", label: "Knitwear & Sweaters", weight: 8, patterns: [/\bknitwear\b/i, /\bsweater\b/i, /\bcable\s*knit\b/i, /\bknit\b/i] },
  { slug: "shirts", label: "Shirts & Blouses", weight: 10, patterns: [/\bblouse\b/i, /\bplaid\s*shirt\b/i, /\bshirt\b/i] },
  { slug: "tops", label: "Tops", weight: 7, patterns: [/\btops?\b/i, /\bt[\s-]?shirts?\b/i] },

  { slug: "jeans", label: "Jeans", weight: 12, patterns: [/\bjeans?\b/i, /\bdenim\b/i] },
  { slug: "trousers", label: "Trousers & Pants", weight: 10, patterns: [/\btrousers?\b/i, /\bpants?\b/i, /\bcorduroy\s*pant/i] },
  { slug: "skirts", label: "Skirts", weight: 10, patterns: [/\bskirt\b/i] },
  { slug: "dresses", label: "Dresses", weight: 10, patterns: [/\bdress\b/i] },

  { slug: "curtains", label: "Curtains", weight: 12, patterns: [/\bcurtains?\b/i, /\bdrape/i, /\bvoile\b/i, /\bsheer\s*(curtain|panel|voile)?\b/i, /\bblackout\b/i, /\brideaux\b/i, /\boccultant/i] },
  { slug: "pillow-covers", label: "Pillow Covers", weight: 13, patterns: [/\bcushion\b/i, /\bpillow\s*cover\b/i, /\bthrow\s*pillow\b/i, /\bpillow\s*case\b/i, /\bpillowcase\b/i, /\bpillow\b/i] },
  { slug: "cushions", label: "Pillow Covers", weight: 10, patterns: [/\bcushion\s*cover\b/i] },
  {
    slug: "bed-covers",
    label: "Bed Covers",
    weight: 16,
    patterns: [
      /\bbed\s*sheets?\b/i,
      /\bsheet\s*set\b/i,
      /\bfitted\s*sheet\b/i,
      /\bflat\s*sheet\b/i,
      /\bbedding\b/i,
      /\bduvet\b/i,
      /\bcomforter\b/i,
      /\bbed\s*cover\b/i,
      /\bquilt\b/i,
      /\bthread\s*count\b/i,
      /\bdeep[\s-]?pocket\b/i,
    ],
  },
  { slug: "blankets", label: "Blankets", weight: 11, patterns: [/\bblanket\b/i, /\bthrow\b(?!\s*pillow)/i, /\bfleece\b/i] },
  { slug: "mattress", label: "Mattress Toppers", weight: 12, patterns: [/\bmattress\b/i, /\btopper\b/i] },
]

const CHANNEL_SLUG_MAP: Record<string, MainChannel> = {
  women: "women",
  men: "men",
  kids: "kids",
  "women-shoes": "shoes",
  "men-shoes": "shoes",
  "kids-shoes": "shoes",
  shoes: "shoes",
  "women-bags": "accessories",
  "men-bags": "accessories",
  bags: "accessories",
  curtains: "home",
  cushions: "home",
  "pillow-covers": "home",
  "bed-covers": "home",
  blankets: "home",
  mattress: "home",
  "mattress-toppers": "home",
  furniture: "home",
  home: "home",
  "clothes-women": "women",
  "clothes-men": "men",
  "clothes-kids": "kids",
  "clothes-women-shoes": "shoes",
  "clothes-men-shoes": "shoes",
  "clothes-kids-shoes": "shoes",
  "clothes-shoes": "shoes",
  "clothes-women-bags": "accessories",
  "clothes-men-bags": "accessories",
  "clothes-bags": "accessories",
}

function typeBySlug(slug: string): ProductTypeDef {
  return (
    PRODUCT_TYPES.find((d) => d.slug === slug) || {
      slug,
      label: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      patterns: [],
    }
  )
}

function resolveOverride(product: { id?: string | number; handle?: string }): ProductTypeDef | null {
  const id = String(product.id || "")
  const handle = String(product.handle || "").toLowerCase()
  const slug = PRODUCT_TYPE_OVERRIDES[id] || PRODUCT_TYPE_OVERRIDES[handle]
  return slug ? typeBySlug(slug) : null
}

/** Normalize demo/DB subcategory slugs to nav-aligned clothes-* form */
export function normalizeSubCategorySlug(slug?: string, categorySlug?: string): string | undefined {
  if (!slug) return undefined
  const s = slug.toLowerCase().trim()
  if (s.startsWith("clothes-") || s.startsWith("furniture-")) return s
  if (categorySlug?.toLowerCase() === "furniture" || categorySlug?.toLowerCase() === "home") {
    return s.includes("furniture") ? s : `furniture-${s}`
  }
  if (categorySlug?.toLowerCase() === "clothes" || CHANNEL_SLUG_MAP[s]) {
    if (
      s === "curtains" ||
      s === "mattress-toppers" ||
      s === "pillow-covers" ||
      s === "cushions" ||
      s === "bed-covers" ||
      s === "blankets" ||
      s === "mattress"
    ) {
      return s
    }
    return s.startsWith("clothes-") ? s : `clothes-${s}`
  }
  return s
}

export function resolveChannel(product: {
  subCategorySlug?: string
  subCategory?: string
  categorySlug?: string
  category?: string
  gender?: string
}): MainChannel {
  const slug = (product.subCategorySlug || "").toLowerCase()
  if (CHANNEL_SLUG_MAP[slug]) return CHANNEL_SLUG_MAP[slug]
  const short = slug.replace(/^clothes-/, "").replace(/^furniture-/, "")
  if (CHANNEL_SLUG_MAP[short]) return CHANNEL_SLUG_MAP[short]
  if (product.gender) {
    const g = product.gender.toLowerCase()
    if (g === "women" || g === "men" || g === "kids") return g
  }
  const cat = (product.categorySlug || product.category || "").toLowerCase()
  if (cat === "furniture") return "home"
  return "clothes"
}

export function inferProductType(title: string, channel?: MainChannel): ProductTypeDef {
  const t = title || ""
  const scores = new Map<string, number>()
  const apparelSkip = new Set([
    "curtains", "cushions", "pillow-covers", "bed-covers", "blankets", "mattress",
    "bags", "gloves", "sets", "coats", "jackets",
    "hoodies", "vests", "blazers", "cardigans", "knitwear", "shirts", "tops",
    "trousers", "jeans", "skirts", "dresses",
  ])
  const homeTypes = new Set([
    "curtains",
    "cushions",
    "pillow-covers",
    "bed-covers",
    "blankets",
    "mattress",
  ])

  for (const def of PRODUCT_TYPES) {
    if (channel === "home" && !homeTypes.has(def.slug)) continue
    if (channel === "shoes" && apparelSkip.has(def.slug)) continue
    if (!def.patterns.some((re) => re.test(t))) continue
    const prev = scores.get(def.slug) || 0
    scores.set(def.slug, Math.max(prev, def.weight ?? 10))
  }

  if (scores.has("loafers") && scores.has("sneakers")) scores.delete("sneakers")
  if (scores.has("boots") && scores.has("sneakers")) scores.delete("sneakers")
  if (scores.has("heels") && scores.has("flats")) scores.delete("flats")
  if (scores.has("jeans") && scores.has("trousers")) scores.delete("trousers")
  if (scores.has("jackets") && scores.has("coats") && /\bjacket\b/i.test(t) && !/\btrench\b|\bovercoat\b/i.test(t)) {
    scores.delete("coats")
  }
  if (scores.has("coats") && scores.has("cardigans") && /\b(coat|overcoat|trench)\b/i.test(t)) {
    scores.delete("cardigans")
  }
  if (scores.has("jackets") && scores.has("cardigans") && /\bjacket\b/i.test(t)) {
    scores.delete("cardigans")
  }
  if (scores.has("hoodies") && scores.has("jackets")) scores.delete("jackets")
  if (scores.has("blazers") && scores.has("sets") && /\b2[\s-]?piece|skirt\s*set|suit\s*set/i.test(t)) {
    scores.delete("blazers")
  }
  if (scores.has("blazers") && scores.has("cardigans") && /\bcardigan\b/i.test(t)) {
    // Titles like "…Cardigan…Blazer" are usually cardigans
    scores.delete("blazers")
  }
  if (
    scores.has("cardigans") &&
    /\b(pullover|crew\s*neck|sweatshirt|jumper)\b/i.test(t) &&
    !/\b(button|open[\s-]?front)\b/i.test(t)
  ) {
    scores.delete("cardigans")
    scores.set("knitwear", Math.max(scores.get("knitwear") || 0, 12))
  }
  // Thin "… Knit Cardigan" titles are often pullovers mislabeled as cardigans
  if (
    scores.has("cardigans") &&
    /\bwinter\s+knit\s+cardigan\b|\bknit\s+cardigan\b/i.test(t) &&
    !/\b(button|buttons|v[\s-]?neck|shawl|open[\s-]?front)\b/i.test(t)
  ) {
    scores.delete("cardigans")
    scores.set("knitwear", Math.max(scores.get("knitwear") || 0, 13))
  }
  // Sheet sets often mention pillow covers in the pack list — keep them as Bed Covers
  if (
    scores.has("bed-covers") &&
    /\b(sheet\s*set|bed\s*sheets?|fitted\s*sheet|flat\s*sheet|thread\s*count|bedding)\b/i.test(t)
  ) {
    scores.delete("pillow-covers")
    scores.delete("cushions")
    scores.delete("curtains")
    scores.set("bed-covers", Math.max(scores.get("bed-covers") || 0, 18))
  }

  let best: { slug: string; score: number } | null = null
  for (const [slug, score] of scores) {
    if (!best || score > best.score) best = { slug, score }
  }
  if (best) return typeBySlug(best.slug)

  if (channel === "shoes") return typeBySlug("footwear")
  if (channel === "accessories") return typeBySlug("accessories")
  // Never emit a generic "Home" type chip — callers use subcategory fallback
  return typeBySlug("other")
}

/** When title inference fails, map DB furniture subcategory → shop-by type. */
function homeTypeFromSubcategory(subCategorySlug?: string, subCategory?: string): ProductTypeDef | null {
  const key = `${subCategorySlug || ""} ${subCategory || ""}`.toLowerCase()
  if (!key.trim()) return null
  if (/bed|sheet|duvet|comforter|quilt|bedding/.test(key)) return typeBySlug("bed-covers")
  if (/pillow|cushion/.test(key)) return typeBySlug("pillow-covers")
  if (/mattress|topper/.test(key)) return typeBySlug("mattress")
  if (/blanket|throw/.test(key)) return typeBySlug("blankets")
  if (/curtain|drape|voile|rideaux/.test(key)) return typeBySlug("curtains")
  return null
}

export function enrichProductTyping<T extends {
  id?: string | number
  title: string
  handle?: string
  subCategorySlug?: string
  subCategory?: string
  categorySlug?: string
  category?: string
  gender?: string
  productType?: string
  productTypeSlug?: string
}>(product: T): T & { productType: string; productTypeSlug: string; gender?: string; subCategorySlug?: string } {
  const channel = resolveChannel(product)
  // Always re-infer from title (+ overrides). Do not trust stale baked slugs.
  let type = resolveOverride(product) || inferProductType(product.title, channel)
  // Collapse legacy "cushions" into pillow covers for Home nav
  if (type.slug === "cushions") type = typeBySlug("pillow-covers")
  // Legacy fallback labeled chips as "Home (n)" — those are bed textiles in this catalog
  if (type.slug === "home") type = typeBySlug("bed-covers")
  // Unclassified furniture: use subcategory, else Bed Covers (never a bare "Home" chip)
  if (channel === "home" && type.slug === "other") {
    type =
      homeTypeFromSubcategory(product.subCategorySlug, product.subCategory) ||
      typeBySlug("bed-covers")
  }

  const subKey = canonicalSubKey(product.subCategorySlug || product.subCategory)
  const gender =
    product.gender ||
    (channel === "women" || channel === "men" || channel === "kids"
      ? channel
      : channel === "shoes" || channel === "accessories"
        ? subKey.startsWith("men-") || subKey === "men"
          ? "men"
          : subKey.startsWith("kids-") || subKey === "kids"
            ? "kids"
            : subKey.startsWith("women-") || subKey === "women"
              ? "women"
              : undefined
        : undefined)

  return {
    ...product,
    subCategorySlug: normalizeSubCategorySlug(product.subCategorySlug, product.categorySlug) || product.subCategorySlug,
    gender,
    productType: type.label,
    productTypeSlug: type.slug,
  }
}

/** Subcategory links for a main nav channel, built from products present */
export function buildChannelSubcategories(
  channel: MainChannel,
  products: Array<{
    id?: string | number
    title: string
    handle?: string
    subCategorySlug?: string
    subCategory?: string
    categorySlug?: string
    category?: string
    gender?: string
    productType?: string
    productTypeSlug?: string
  }>,
): { slug: string; label: string; count: number; href: string }[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const p of products) {
    const enriched = enrichProductTyping(p)
    if (resolveChannel(enriched) !== channel) continue
    const key = enriched.productTypeSlug
    const prev = counts.get(key)
    if (prev) prev.count += 1
    else counts.set(key, { label: enriched.productType, count: 1 })
  }

  const channelHref = channelShopHref(channel)
  return [...counts.entries()]
    .filter(([slug]) => slug !== "other" && slug !== "home")
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
    .map(([slug, { label, count }]) => ({
      slug,
      label,
      count,
      href: `${channelHref}${channelHref.includes("?") ? "&" : "?"}productType=${encodeURIComponent(slug)}`,
    }))
}

export function channelShopHref(channel: MainChannel): string {
  switch (channel) {
    case "women":
      return "/shop?category=clothes&subCategory=clothes-women,women"
    case "men":
      return "/shop?category=clothes&subCategory=clothes-men,men"
    case "kids":
      return "/shop?category=clothes&subCategory=clothes-kids,kids"
    case "shoes":
      return "/shop?category=clothes&subCategory=clothes-shoes,clothes-women-shoes,clothes-men-shoes,clothes-kids-shoes,women-shoes,men-shoes,kids-shoes,shoes"
    case "accessories":
      return "/shop?category=clothes&subCategory=clothes-bags,clothes-women-bags,clothes-men-bags,women-bags,men-bags,bags"
    case "home":
      return "/shop?category=furniture"
    default:
      return "/shop?category=clothes"
  }
}

const CHANNEL_DISPLAY: Record<MainChannel, string> = {
  women: "Women",
  men: "Men",
  kids: "Kids",
  shoes: "Shoes",
  accessories: "Accessories",
  home: "Home",
  clothes: "Clothes",
}

/** Shopper-facing department line — e.g. Home · Bed Covers (not raw DB “Furniture · Curtains”). */
export function productDepartmentDisplay(product: {
  title: string
  id?: string | number
  handle?: string
  subCategorySlug?: string
  subCategory?: string
  categorySlug?: string
  category?: string
  gender?: string
  productType?: string
  productTypeSlug?: string
}): { channel: MainChannel; channelLabel: string; typeLabel: string; typeSlug: string; href: string } {
  const enriched = enrichProductTyping(product)
  const channel = resolveChannel(enriched)
  const typeSlug = enriched.productTypeSlug
  const typeLabel = enriched.productType
  const base = channelShopHref(channel)
  const href =
    typeSlug && typeSlug !== "other" && typeSlug !== "home"
      ? `${base}${base.includes("?") ? "&" : "?"}productType=${encodeURIComponent(typeSlug)}`
      : base
  return {
    channel,
    channelLabel: CHANNEL_DISPLAY[channel],
    typeLabel,
    typeSlug,
    href,
  }
}

export function channelFromFilters(category?: string, subCategory?: string): MainChannel | null {
  const cat = (category || "").toLowerCase()
  if (cat === "furniture") return "home"
  const subs = (subCategory || "")
    .split(",")
    .map((s) => canonicalSubKey(s))
    .filter(Boolean)
  if (!subs.length) return cat === "clothes" ? "clothes" : null
  if (subs.some((s) => s === "shoes" || s.endsWith("-shoes"))) return "shoes"
  if (subs.some((s) => s === "bags" || s.endsWith("-bags"))) return "accessories"
  if (subs.some((s) => s === "kids")) return "kids"
  if (subs.some((s) => s === "men")) return "men"
  if (subs.some((s) => s === "women")) return "women"
  return cat === "clothes" ? "clothes" : null
}

/** Canonical product-channel keys — never use String.includes("men") (matches "women"). */
export function canonicalSubKey(value?: string): string {
  const raw = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
  if (!raw) return ""
  const stripped = raw.replace(/^clothes-/, "").replace(/^furniture-/, "")
  if (
    /^(women|men|kids)-(shoes|bags)$/.test(stripped) ||
    /^(shoes|bags|curtains|mattress-toppers)$/.test(stripped) ||
    /^(women|men|kids)$/.test(stripped)
  ) {
    return stripped
  }
  if (stripped === "shoe") return "shoes"
  if (stripped === "bag") return "bags"
  return stripped
}

/**
 * Match product subcategory against filter list.
 * Exact key match only — avoids "women".includes("men") false positives.
 */
export function productMatchesSubFilter(
  product: {
    subCategory?: string
    subCategorySlug?: string
  },
  wantedCsv?: string,
): boolean {
  if (!wantedCsv) return true
  const wanted = wantedCsv
    .split(",")
    .map((s) => canonicalSubKey(s))
    .filter(Boolean)
  if (!wanted.length) return true

  const productKeys = new Set(
    [product.subCategorySlug, product.subCategory]
      .map((v) => canonicalSubKey(v))
      .filter(Boolean),
  )

  return wanted.some((w) => productKeys.has(w))
}
