import type { Product } from "@/types/ecommerce"
import { PRODUCTS } from "@/lib/products"
import { productMatchesSubFilter, enrichProductTyping } from "@/lib/product-types"

export interface FilterState {
  q?: string
  category?: string
  subCategory?: string
  /** Product type slug e.g. cardigans, trousers, boots */
  productType?: string
  brands: string[]
  sizes: string[]
  colors: string[]
  genders: string[]
  inStock?: boolean
  discounted?: boolean
  badge?: string
  minPrice?: number
  maxPrice?: number
  sort: string
}

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "best-selling", label: "Best Selling" },
  { value: "title-asc", label: "Alphabetically, A-Z" },
  { value: "title-desc", label: "Alphabetically, Z-A" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "rating-desc", label: "Customer Rating" },
] as const

export function parseFilters(params: Record<string, string | string[] | undefined>): FilterState {
  const getStr = (key: string) => {
    const v = params[key]
    return Array.isArray(v) ? v[0] : v
  }
  const getList = (key: string) => {
    const v = getStr(key)
    return v ? v.split(",").filter(Boolean) : []
  }

  const inStock = getStr("inStock")
  const discounted = getStr("discounted")

  return {
    q: getStr("q"),
    category: getStr("category"),
    subCategory: getStr("subCategory"),
    productType: getStr("productType"),
    brands: getList("brand"),
    sizes: getList("size"),
    colors: getList("color"),
    genders: getList("gender"),
    badge: getStr("badge"),
    inStock: inStock === undefined ? undefined : inStock === "true",
    discounted: discounted === undefined ? undefined : discounted === "true",
    minPrice: getStr("minPrice") ? Number(getStr("minPrice")) : undefined,
    maxPrice: getStr("maxPrice") ? Number(getStr("maxPrice")) : undefined,
    sort: getStr("sort") ?? "featured",
  }
}

export function buildQuery(filters: FilterState): string {
  const p = new URLSearchParams()
  if (filters.q) p.set("q", filters.q)
  if (filters.category) p.set("category", filters.category)
  if (filters.subCategory) p.set("subCategory", filters.subCategory)
  if (filters.productType) p.set("productType", filters.productType)
  if (filters.brands.length) p.set("brand", filters.brands.join(","))
  if (filters.sizes.length) p.set("size", filters.sizes.join(","))
  if (filters.colors.length) p.set("color", filters.colors.join(","))
  if (filters.genders.length) p.set("gender", filters.genders.join(","))
  if (filters.badge) p.set("badge", filters.badge)
  if (filters.inStock !== undefined) p.set("inStock", String(filters.inStock))
  if (filters.discounted !== undefined) p.set("discounted", String(filters.discounted))
  if (filters.minPrice !== undefined) p.set("minPrice", String(filters.minPrice))
  if (filters.maxPrice !== undefined) p.set("maxPrice", String(filters.maxPrice))
  if (filters.sort && filters.sort !== "featured") p.set("sort", filters.sort)
  return p.toString()
}

export function applyFilters(filters: FilterState, catalog: Product[] = PRODUCTS): Product[] {
  let result = catalog.filter((raw) => {
    const p = enrichProductTyping(raw)
    const cat = (filters.category || "").toLowerCase()
    if (
      cat &&
      p.category.toLowerCase() !== cat &&
      (p.categorySlug || "").toLowerCase() !== cat
    ) {
      return false
    }
    if (filters.subCategory && !productMatchesSubFilter(p, filters.subCategory)) return false
    if (filters.productType) {
      const want = filters.productType.toLowerCase()
      if ((p.productTypeSlug || "").toLowerCase() !== want && (p.productType || "").toLowerCase() !== want) {
        return false
      }
    }
    if (filters.brands.length && !filters.brands.includes(p.brand)) return false
    if (filters.badge && p.badge?.toLowerCase() !== filters.badge.toLowerCase()) return false
    if (filters.sizes.length && !p.sizes?.some((s) => filters.sizes.includes(s))) return false
    if (filters.colors.length && !p.colors?.some((c) => filters.colors.includes(c.name))) return false
    if (
      filters.genders.length &&
      !filters.genders.some(
        (g) =>
          p.gender?.toLowerCase() === g.toLowerCase() ||
          p.category.toLowerCase() === g.toLowerCase(),
      )
    ) {
      return false
    }
    if (filters.inStock && p.inStock === false) return false
    if (filters.discounted && !(p.compareAtPrice && p.compareAtPrice > p.price)) return false
    if (filters.minPrice !== undefined && p.price < filters.minPrice) return false
    if (filters.maxPrice !== undefined && p.price > filters.maxPrice) return false
    return true
  })

  if (filters.q) {
    const qLower = filters.q.toLowerCase().trim()
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(qLower) ||
        p.brand.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower) ||
        p.subCategory.toLowerCase().includes(qLower) ||
        (p.productType && p.productType.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower)),
    )
  }

  // Sort
  switch (filters.sort) {
    case "newest":
    case "date-desc":
      result.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      break
    case "price-asc":
      result.sort((a, b) => a.price - b.price)
      break
    case "price-desc":
      result.sort((a, b) => b.price - a.price)
      break
    case "title-asc":
      result.sort((a, b) => a.title.localeCompare(b.title))
      break
    case "title-desc":
      result.sort((a, b) => b.title.localeCompare(a.title))
      break
    case "rating-desc":
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      break
    case "best-selling":
      result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      break
    default:
      // featured
      break
  }

  return result
}
