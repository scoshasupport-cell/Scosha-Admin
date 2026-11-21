/**
 * Storefront category routes mapped to real DB category / subcategory slugs.
 * Live catalog parents: clothes, furniture (+ skincare/electronics coming soon).
 * Pupasita apparel uses clothes-women / clothes-men / clothes-kids;
 * shoes & bags are gender-prefixed (clothes-women-shoes, clothes-women-bags, …).
 */

export const SHOE_SUBS = [
  "clothes-shoes",
  "clothes-women-shoes",
  "clothes-men-shoes",
  "clothes-kids-shoes",
] as const

export const BAG_SUBS = [
  "clothes-bags",
  "clothes-women-bags",
  "clothes-men-bags",
] as const

function shop(category: string, subCategories?: readonly string[]) {
  const params = new URLSearchParams()
  params.set("category", category)
  if (subCategories?.length) {
    params.set("subCategory", subCategories.join(","))
  }
  return `/shop?${params.toString()}`
}

/** Editorial main nav + strip + footer shop links */
export const CATEGORY_ROUTES = {
  women: {
    label: "Women",
    href: shop("clothes", ["clothes-women", "women"]),
  },
  men: {
    label: "Men",
    href: shop("clothes", ["clothes-men", "men"]),
  },
  kids: {
    label: "Kids",
    href: shop("clothes", ["clothes-kids", "kids"]),
  },
  shoes: {
    label: "Shoes",
    href: shop("clothes", [
      ...SHOE_SUBS,
      "women-shoes",
      "men-shoes",
      "kids-shoes",
      "shoes",
    ]),
  },
  beauty: {
    label: "Beauty",
    href: "/skincare",
  },
  accessories: {
    label: "Accessories",
    href: shop("clothes", [...BAG_SUBS, "women-bags", "men-bags", "bags"]),
  },
  bags: {
    label: "Bags",
    href: shop("clothes", [...BAG_SUBS, "women-bags", "men-bags", "bags"]),
  },
  home: {
    label: "Home",
    href: shop("furniture"),
  },
  tech: {
    label: "Tech",
    href: "/electronics",
  },
  clothes: {
    label: "Clothes",
    href: shop("clothes"),
  },
} as const

/** Main header nav order (editorial mockup) */
export const MAIN_NAV = [
  CATEGORY_ROUTES.women,
  CATEGORY_ROUTES.men,
  CATEGORY_ROUTES.kids,
  CATEGORY_ROUTES.shoes,
  CATEGORY_ROUTES.beauty,
  CATEGORY_ROUTES.accessories,
  CATEGORY_ROUTES.home,
] as const

export function isSubActive(currentSub: string, routeHref: string): boolean {
  const want = new URL(routeHref, "http://local").searchParams.get("subCategory") || ""
  if (!want) return false
  const wantParts = want.split(",").map((s) => s.trim().toLowerCase())
  const haveParts = currentSub
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!haveParts.length) return false
  return wantParts.some((w) => haveParts.includes(w))
}

/** Friendly shop title from category + subCategory query */
export function shopPageTitle(category?: string, subCategory?: string): string | null {
  const cat = (category || "").toLowerCase()
  const subs = (subCategory || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (subs.length) {
    if (subs.some((s) => s === "clothes-women" || s === "women") && !subs.some((s) => s.includes("shoe") || s.includes("bag"))) {
      if (subs.length <= 2) return "Women"
    }
    if (subs.some((s) => s === "clothes-men" || s === "men") && !subs.some((s) => s.includes("shoe") || s.includes("bag") || s.includes("women"))) {
      if (subs.length <= 2) return "Men"
    }
    if (subs.some((s) => s.includes("kids")) && !subs.some((s) => s.includes("shoe"))) return "Kids"
    if (subs.some((s) => s.includes("shoes"))) return "Shoes"
    if (subs.some((s) => s.includes("bags"))) return "Bags"
  }

  if (cat === "furniture") return "Home · Pillow covers, curtains & more"
  if (cat === "clothes") return "Clothes · Winter collection"
  return null
}

/** Cover banner from /public/main-category-slider — keyed by editorial category */
const CATEGORY_BANNERS: Record<string, string> = {
  women: "/main-category-slider/women.jpeg",
  men: "/main-category-slider/man.jpeg",
  kids: "/main-category-slider/kids.jpeg",
  shoes: "/main-category-slider/shoes.jpeg",
  bags: "/main-category-slider/bags.jpeg",
  accessories: "/main-category-slider/bags.jpeg",
  beauty: "/main-category-slider/beauty.jpeg",
  home: "/main-category-slider/home.jpeg",
  furniture: "/main-category-slider/home.jpeg",
  clothes: "/main-category-slider/women.jpeg",
  tech: "/main-category-slider/Tech.jpeg",
}

/** Resolve shop cover image for the current category / subcategory filters */
export function shopCategoryBanner(category?: string, subCategory?: string): string | null {
  const title = shopPageTitle(category, subCategory)
  if (title) {
    const key = title.split("·")[0].trim().toLowerCase()
    if (CATEGORY_BANNERS[key]) return CATEGORY_BANNERS[key]
  }
  const cat = (category || "").toLowerCase()
  return CATEGORY_BANNERS[cat] || null
}

/** Apparel shop-by chips under Clothes */
export const CLOTHES_SHOP_BY = [
  CATEGORY_ROUTES.women,
  CATEGORY_ROUTES.men,
  CATEGORY_ROUTES.kids,
  CATEGORY_ROUTES.shoes,
  CATEGORY_ROUTES.bags,
] as const
