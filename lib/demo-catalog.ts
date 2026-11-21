import type { Product } from "@/types/ecommerce"
import { PRODUCTS, getProduct } from "@/lib/products"
import { applyFilters, type FilterState } from "@/lib/filters"
import { productMatchesSubFilter } from "@/lib/product-types"

/** Static demo products for frontend testing when the API is offline (Amaz-style fallback). */
export const DEMO_PRODUCTS = PRODUCTS

export function getDemoProduct(handleOrSlug: string): Product | undefined {
  return getProduct(handleOrSlug)
}

export function searchDemoProducts(q: string, limit = 48): Product[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  return DEMO_PRODUCTS.filter((p) => {
    const hay = `${p.title} ${p.brand} ${p.category} ${p.subCategory}`.toLowerCase()
    return hay.includes(needle)
  }).slice(0, limit)
}

export function filterDemoProducts(params?: {
  category?: string
  subCategory?: string
  brand?: string
  q?: string
  search?: string
  limit?: number
  sort?: string
  newArrival?: boolean | string
}): Product[] {
  let list = [...DEMO_PRODUCTS]
  const q = (params?.q || params?.search || "").trim().toLowerCase()
  if (q) list = searchDemoProducts(q, 200)

  if (params?.category) {
    const cat = params.category.toLowerCase()
    list = list.filter(
      (p) =>
        p.categorySlug?.toLowerCase() === cat ||
        p.category.toLowerCase() === cat ||
        p.department === cat,
    )
  }
  if (params?.subCategory) {
    list = list.filter((p) => productMatchesSubFilter(p, params.subCategory))
  }
  if (params?.brand) {
    const brand = params.brand.toLowerCase()
    list = list.filter(
      (p) =>
        p.brand.toLowerCase() === brand ||
        p.brand.toLowerCase().replace(/\s+/g, "-") === brand,
    )
  }

  switch (params?.sort) {
    case "price_asc":
    case "price-asc":
      list.sort((a, b) => a.price - b.price)
      break
    case "price_desc":
    case "price-desc":
      list.sort((a, b) => b.price - a.price)
      break
    case "newest":
      list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      break
    case "name":
      list.sort((a, b) => a.title.localeCompare(b.title))
      break
    default:
      break
  }

  const limit = params?.limit ?? DEMO_PRODUCTS.length
  return list.slice(0, Math.max(1, limit))
}

export function filterDemoWithShopFilters(filters: FilterState): Product[] {
  return applyFilters(filters, DEMO_PRODUCTS)
}

export function demoHomeRails() {
  const featured = filterDemoProducts({ limit: DEMO_PRODUCTS.length, sort: "popular" })
  const newest = [...DEMO_PRODUCTS]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 48)
  const deals = filterDemoProducts({ limit: 48, sort: "price_asc" })
  return { featured, newest, deals }
}
