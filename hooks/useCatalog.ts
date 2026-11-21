"use client"

import { useQuery } from "@tanstack/react-query"
import { api, toQuery } from "@/lib/api"
import {
  mapApiBrand,
  mapApiCategory,
  mapApiProduct,
  mapApiProducts,
  type ApiBrand,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/shop-api"
import type { Product } from "@/types/ecommerce"
import { type FilterState } from "@/lib/filters"
import { SHOP_PRODUCT_FETCH_LIMIT } from "@/lib/commerce"
import { productMatchesSubFilter } from "@/lib/product-types"

export type ProductQuery = {
  page?: number
  limit?: number
  sort?: string
  brand?: string
  category?: string
  subCategory?: string
  subcategory?: string
  collection?: string
  q?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  color?: string
  size?: string
  inStock?: boolean | string
  tag?: string
  tags?: string
  featured?: boolean
  newArrival?: boolean
  bestSeller?: boolean
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === "object") {
    const obj = data as { data?: T[]; products?: T[]; items?: T[] }
    if (Array.isArray(obj.products)) return obj.products
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.data)) return obj.data
  }
  return []
}

/** Map Scosha UI sort keys → API sort presets. */
export function mapSortToApi(sort?: string): string | undefined {
  switch (sort) {
    case "price-asc":
      return "price_asc"
    case "price-desc":
      return "price_desc"
    case "newest":
      return "newest"
    case "best-selling":
      return "popular"
    case "rating-desc":
      return "rating"
    case "title-asc":
      return "name"
    case "title-desc":
      return "name"
    case "featured":
    default:
      return undefined
  }
}

function slugifyFilter(value?: string): string | undefined {
  if (!value) return undefined
  // Preserve comma-separated multi-subCategory lists (shoes/bags)
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
    .join(",")
}

export function filtersToProductQuery(filters: FilterState): ProductQuery {
  return {
    limit: SHOP_PRODUCT_FETCH_LIMIT,
    q: filters.q,
    category: slugifyFilter(filters.category),
    subCategory: slugifyFilter(filters.subCategory),
    brand: filters.brands[0] ? slugifyFilter(filters.brands[0]) : undefined,
    size: filters.sizes[0],
    color: filters.colors[0],
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    inStock: filters.inStock === true ? "true" : undefined,
    sort: mapSortToApi(filters.sort),
  }
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<ApiCategory[] | { data?: ApiCategory[] }>("/categories")
      return unwrapList<ApiCategory>(res.data).map(mapApiCategory)
    },
    staleTime: 300_000,
  })
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get<ApiBrand[] | { data?: ApiBrand[] }>("/brands")
      return unwrapList<ApiBrand>(res.data).map(mapApiBrand)
    },
    staleTime: 300_000,
  })
}

/** Live catalog only. Failures surface as `isError` — no demo filler. */
export function useProducts(params?: ProductQuery, enabled = true) {
  return useQuery({
    queryKey: ["products", params],
    enabled,
    queryFn: async (): Promise<{
      products: Product[]
      total?: number
      source: "api"
    }> => {
      const res = await api.get<ApiProduct[] | { products?: ApiProduct[]; items?: ApiProduct[] }>(
        `/products${toQuery({
          limit: params?.limit ?? SHOP_PRODUCT_FETCH_LIMIT,
          ...params,
        })}`,
      )
      const products = mapApiProducts(unwrapList<ApiProduct>(res.data))
      return { products, total: res.meta?.total ?? products.length, source: "api" }
    },
    staleTime: 60_000,
    retry: 0,
  })
}

export function useProduct(handleOrSlug: string) {
  return useQuery({
    queryKey: ["product", handleOrSlug],
    enabled: Boolean(handleOrSlug),
    queryFn: async (): Promise<{ product: Product | undefined; source: "api" }> => {
      const res = await api.get<ApiProduct>(`/products/${encodeURIComponent(handleOrSlug)}`)
      return { product: mapApiProduct(res.data), source: "api" }
    },
    staleTime: 60_000,
    retry: 0,
  })
}

export function useShopProducts(filters: FilterState) {
  const query = filtersToProductQuery(filters)
  return useQuery({
    queryKey: ["shop-products", filters],
    queryFn: async (): Promise<{ products: Product[]; source: "api" }> => {
      const res = await api.get<ApiProduct[] | { products?: ApiProduct[]; items?: ApiProduct[] }>(
        `/products${toQuery(query as Record<string, unknown>)}`,
      )
      let products = mapApiProducts(unwrapList<ApiProduct>(res.data))

      // Hard-separate channels client-side (never let women leak into men, etc.)
      if (filters.subCategory) {
        products = products.filter((p) => productMatchesSubFilter(p, filters.subCategory))
      }

      if (filters.brands.length > 1) {
        products = products.filter((p) =>
          filters.brands.some(
            (b) =>
              b === p.brand ||
              b === p.brand.toLowerCase().replace(/\s+/g, "-"),
          ),
        )
      }
      if (filters.sizes.length > 1) {
        products = products.filter((p) =>
          filters.sizes.some((s) => p.sizes?.includes(s) || p.variants.some((v) => v.size === s)),
        )
      }
      if (filters.colors.length > 1) {
        products = products.filter((p) =>
          filters.colors.some((c) => p.colors?.some((pc) => pc.name === c)),
        )
      }
      if (filters.discounted) {
        products = products.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price)
      }
      if (filters.badge) {
        products = products.filter((p) => p.badge === filters.badge)
      }
      if (filters.productType) {
        const want = filters.productType.toLowerCase()
        products = products.filter(
          (p) =>
            p.productTypeSlug?.toLowerCase() === want ||
            p.productType?.toLowerCase() === want,
        )
      }
      if (filters.sort === "title-desc") {
        products = [...products].sort((a, b) => b.title.localeCompare(a.title))
      }
      return { products, source: "api" }
    },
    staleTime: 30_000,
    retry: 0,
  })
}

export function useSearch(q: string, limit = 48) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: ["search", trimmed, limit],
    enabled: trimmed.length > 0,
    queryFn: async () => {
      const res = await api.get<
        ApiProduct[] | { products?: ApiProduct[]; items?: ApiProduct[]; data?: ApiProduct[] }
      >(`/search${toQuery({ q: trimmed, limit })}`)
      const raw = res.data
      const list = Array.isArray(raw)
        ? raw
        : unwrapList<ApiProduct>(
            (raw as { items?: ApiProduct[] })?.items ??
              (raw as { products?: ApiProduct[] })?.products ??
              (raw as { data?: ApiProduct[] })?.data ??
              raw,
          )
      return { products: mapApiProducts(list), source: "api" as const }
    },
    staleTime: 30_000,
    retry: 0,
  })
}

/** Home rails — live catalog only. */
export function useHomeRails() {
  return useQuery({
    queryKey: ["home-rails"],
    queryFn: async () => {
      const [featuredRes, newestRes, dealsRes] = await Promise.all([
        api.get<ApiProduct[]>(`/products${toQuery({ limit: 48, sort: "popular" })}`),
        api.get<ApiProduct[]>(
          `/products${toQuery({ limit: 48, sort: "newest", newArrival: "true" })}`,
        ),
        api.get<ApiProduct[]>(`/products${toQuery({ limit: 48, sort: "price_asc" })}`),
      ])
      return {
        featured: mapApiProducts(unwrapList<ApiProduct>(featuredRes.data)),
        newest: mapApiProducts(unwrapList<ApiProduct>(newestRes.data)),
        deals: mapApiProducts(unwrapList<ApiProduct>(dealsRes.data)),
        source: "api" as const,
      }
    },
    staleTime: 60_000,
    retry: 0,
  })
}
