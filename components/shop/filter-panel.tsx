"use client"

import { useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { type FilterState, buildQuery } from "@/lib/filters"
import { useCurrency } from "@/lib/use-currency"
import { useBrands, useCategories } from "@/hooks/useCatalog"
import { catalogFacets } from "@/lib/shop-api"
import { CLOTHES_SHOP_BY, isSubActive } from "@/lib/category-routes"
import {
  buildChannelSubcategories,
  channelFromFilters,
} from "@/lib/product-types"
import { PRODUCTS } from "@/lib/products"
import type { Product } from "@/types/ecommerce"

const DEPARTMENTS = [
  { label: "Clothes", slug: "clothes", href: "/shop?category=clothes", soon: false },
  { label: "Home", slug: "furniture", href: "/shop?category=furniture", soon: false },
  { label: "Skincare", slug: "skincare", href: "/skincare", soon: true },
  { label: "Electronics", slug: "electronics", href: "/electronics", soon: true },
] as const

interface FilterPanelProps {
  filters: FilterState
  products?: Product[]
  onFilterChange?: () => void
}

function activeSubList(sub?: string): string[] {
  return (sub || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function FilterPanel({ filters, products = [], onFilterChange }: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { format } = useCurrency()
  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()

  const facets = useMemo(() => catalogFacets(products), [products])

  const activeCategory = categories.find(
    (c) => c.slug === filters.category?.toLowerCase(),
  )
  const subcategoryOptions =
    activeCategory?.subcategories?.length
      ? activeCategory.subcategories
      : facets.subCategories.map((name) => ({ slug: name, name }))

  const selectedSubs = activeSubList(filters.subCategory)
  const isClothes = (filters.category || "").toLowerCase() === "clothes"
  const channel = channelFromFilters(filters.category, filters.subCategory)
  const productTypeOptions = useMemo(() => {
    if (!channel || channel === "clothes") return []
    return buildChannelSubcategories(channel, products.length ? products : PRODUCTS)
  }, [channel, products])

  function update(next: Partial<FilterState>) {
    const merged = { ...filters, ...next }
    const query = buildQuery(merged)
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    onFilterChange?.()
  }

  function toggleInList(key: "brands" | "sizes" | "colors" | "genders", value: string) {
    const list = filters[key] || []
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    update({ [key]: next } as Partial<FilterState>)
  }

  const maxPriceLimit = Math.max(facets.maxPrice, 250)
  const brandOptions =
    brands.length > 0
      ? brands.filter((b) => b.name.toLowerCase() !== "amaz").slice(0, 40)
      : facets.brands.map((name) => ({ slug: name.toLowerCase().replace(/\s+/g, "-"), name }))

  const sizeOptions = facets.sizes.length ? facets.sizes : ["XS", "S", "M", "L", "XL", "XXL"]
  const colorOptions = facets.colors.length
    ? facets.colors
    : [{ name: "Black", hex: "#222222" }, { name: "Navy", hex: "#28344E" }]

  return (
    <div className="flex flex-col divide-y divide-border-subtle text-primary-text">
      <div className="pb-4">
        <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Department</h4>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() =>
              update({
                category: undefined,
                subCategory: undefined,
                productType: undefined,
                brands: [],
                sizes: [],
                colors: [],
                genders: [],
                badge: undefined,
                discounted: undefined,
                inStock: undefined,
                minPrice: undefined,
                maxPrice: undefined,
                q: undefined,
              })
            }
            className={`flex items-center justify-between text-left text-xs font-semibold py-1.5 px-3 rounded-xl transition-all ${
              !filters.category && !filters.subCategory && !filters.productType
                ? "text-white shadow-sm"
                : "text-subtext hover:bg-brand-light hover:text-brand"
            }`}
            style={
              !filters.category && !filters.subCategory && !filters.productType
                ? { background: "#7A1F2B" }
                : {}
            }
          >
            <span>All Products</span>
          </button>
          {DEPARTMENTS.map(({ label, slug, href, soon }) => (
            soon ? (
              <Link
                key={slug}
                href={href}
                className="flex items-center justify-between text-left text-xs font-semibold py-1.5 px-3 rounded-xl text-subtext transition-all hover:bg-brand-light hover:text-brand"
              >
                <span>{label}</span>
                <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[9px] font-bold text-brand">
                  Soon
                </span>
              </Link>
            ) : (
              <button
                key={slug}
                type="button"
                onClick={() =>
                  update({
                    category: filters.category === slug ? undefined : slug,
                    subCategory: undefined,
                    productType: undefined,
                  })
                }
                className={`flex items-center justify-between text-left text-xs font-semibold py-1.5 px-3 rounded-xl transition-all ${
                  filters.category === slug
                    ? "text-white shadow-sm"
                    : "text-subtext hover:bg-brand-light hover:text-brand"
                }`}
                style={filters.category === slug ? { background: "#7A1F2B" } : {}}
              >
                <span>{label}</span>
              </button>
            )
          ))}
        </div>
      </div>

      {isClothes && (
        <div className="py-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Shop by</h4>
          <div className="flex flex-wrap gap-1.5">
            {CLOTHES_SHOP_BY.map((item) => {
              const active = isSubActive(filters.subCategory || "", item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => onFilterChange?.()}
                  className={`inline-flex min-h-11 touch-manipulation items-center rounded-lg border px-2.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-brand bg-brand-light text-brand"
                      : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => update({ category: "clothes", subCategory: undefined })}
              className={`inline-flex min-h-11 touch-manipulation items-center rounded-lg border px-2.5 text-xs font-semibold transition-all ${
                isClothes && !filters.subCategory
                  ? "border-brand bg-brand-light text-brand"
                  : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
              }`}
            >
              All clothes
            </button>
          </div>
        </div>
      )}

      {productTypeOptions.length > 0 && (
        <div className="py-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">
            Product Type
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => update({ productType: undefined })}
              className={`inline-flex min-h-11 touch-manipulation items-center rounded-lg border px-2.5 text-xs font-semibold transition-all ${
                !filters.productType
                  ? "border-brand bg-brand-light text-brand"
                  : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
              }`}
            >
              All types
            </button>
            {productTypeOptions.map((sub) => {
              const active = filters.productType === sub.slug
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() =>
                    update({ productType: active ? undefined : sub.slug })
                  }
                  className={`inline-flex min-h-11 touch-manipulation items-center rounded-lg border px-2.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-brand bg-brand-light text-brand"
                      : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
                  }`}
                >
                  {sub.label} ({sub.count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {subcategoryOptions.length > 0 && !productTypeOptions.length && (
        <div className="py-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Product Type</h4>
          <div className="flex flex-wrap gap-1.5">
            {subcategoryOptions.map((sub) => {
              const active = selectedSubs.includes(sub.slug.toLowerCase())
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() =>
                    update({
                      subCategory: active && selectedSubs.length === 1 ? undefined : sub.slug,
                      productType: undefined,
                    })
                  }
                  className={`inline-flex min-h-11 touch-manipulation items-center rounded-lg border px-2.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-brand bg-brand-light text-brand"
                      : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
                  }`}
                >
                  {sub.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {sizeOptions.length > 0 && (
        <div className="py-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Size</h4>
          <div className="grid grid-cols-3 gap-1.5">
            {sizeOptions.map((size) => {
              const active = filters.sizes.includes(size)
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleInList("sizes", size)}
                  className={`flex min-h-11 items-center justify-center rounded-lg border text-xs font-bold uppercase transition-all sm:min-h-9 ${
                    active
                      ? "border-brand bg-brand text-white shadow-xs"
                      : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {colorOptions.length > 0 && (
        <div className="py-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Color</h4>
          <div className="grid grid-cols-2 gap-2">
            {colorOptions.map((c) => {
              const active = filters.colors.includes(c.name)
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleInList("colors", c.name)}
                  className={`flex items-center gap-2 rounded-lg border p-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-brand bg-brand-light text-brand"
                      : "border-border-subtle bg-white text-subtext hover:border-brand"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {brandOptions.length > 0 && (
        <div className="py-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Brands</h4>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {brandOptions.map((brand) => {
              const active = filters.brands.includes(brand.slug) || filters.brands.includes(brand.name)
              return (
                <label
                  key={brand.slug}
                  className="flex cursor-pointer items-center gap-2 text-xs text-subtext hover:text-primary-text"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleInList("brands", brand.slug)}
                    className="accent-brand rounded h-3.5 w-3.5"
                  />
                  <span>{brand.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="py-4">
        <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-primary-text">Price Range</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={maxPriceLimit}
            placeholder="Min"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              update({ minPrice: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })
            }
            className="h-9 w-full rounded-lg border border-border-subtle px-2.5 text-xs text-primary-text focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
          />
          <span className="text-xs text-muted">-</span>
          <input
            type="number"
            min={0}
            max={maxPriceLimit}
            placeholder="Max"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              update({ maxPrice: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })
            }
            className="h-9 w-full rounded-lg border border-border-subtle px-2.5 text-xs text-primary-text focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
          />
        </div>
        <p className="mt-2 text-[10px] text-muted">Up to {format(maxPriceLimit)}</p>
      </div>

      <div className="py-4 space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary-text">
          <input
            type="checkbox"
            checked={Boolean(filters.discounted)}
            onChange={(e) => update({ discounted: e.target.checked ? true : undefined })}
            className="accent-brand rounded h-3.5 w-3.5"
          />
          <span>On Sale / Discounted</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary-text">
          <input
            type="checkbox"
            checked={Boolean(filters.inStock)}
            onChange={(e) => update({ inStock: e.target.checked ? true : undefined })}
            className="accent-brand rounded h-3.5 w-3.5"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="w-full rounded-xl border border-border-subtle bg-surface py-2.5 text-xs font-bold uppercase tracking-wider text-subtext hover:border-brand hover:bg-brand-light hover:text-brand transition-all"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  )
}
