"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { X, ChevronDown, SlidersHorizontal } from "lucide-react"
import type { Product } from "@/types/ecommerce"
import { type FilterState, buildQuery, SORT_OPTIONS } from "@/lib/filters"
import { shopPageTitle, shopCategoryBanner } from "@/lib/category-routes"
import { ProductCard } from "@/components/product/product-card"
import { FilterPanel } from "@/components/shop/filter-panel"
import { CompareBar } from "@/components/shop/compare-bar"
import { ShopSubcategoryStrip } from "@/components/shop/shop-subcategory-strip"
import { DepartmentTabs } from "@/components/site/department-tabs"
import { PRODUCT_TYPES } from "@/lib/product-types"
import { useModalFocus } from "@/hooks/useModalFocus"

interface ShopViewProps {
  filters: FilterState
  products: Product[]
}

export function ShopView({ filters, products }: ShopViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const comparedProducts = products.filter((product) => compareIds.includes(product.id))
  const filterDialogRef = useModalFocus(mobileFilterOpen, () => setMobileFilterOpen(false))

  function setSort(sort: string) {
    const query = buildQuery({ ...filters, sort })
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function update(next: Partial<FilterState>) {
    const query = buildQuery({ ...filters, ...next })
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function clearAllFilters() {
    // Bare /shop = every department (do not bounce back to clothes-only)
    router.push(pathname, { scroll: false })
  }

  const activeChips: { label: string; onRemove: () => void }[] = []
  if (filters.q) activeChips.push({ label: `Search: "${filters.q}"`, onRemove: () => update({ q: undefined }) })
    if (filters.category) {
    const catLabel = shopPageTitle(filters.category, filters.subCategory) || filters.category
    activeChips.push({
      label: `Category: ${catLabel}`,
      onRemove: () =>
        update({
          category: undefined,
          subCategory: undefined,
          productType: undefined,
        }),
    })
  } else if (filters.subCategory) {
    activeChips.push({
      label: `Type: ${shopPageTitle(undefined, filters.subCategory) || filters.subCategory}`,
      onRemove: () => update({ subCategory: undefined, productType: undefined }),
    })
  }
  if (filters.productType) {
    const typeLabel =
      PRODUCT_TYPES.find((t) => t.slug === filters.productType)?.label || filters.productType
    activeChips.push({
      label: `Style: ${typeLabel}`,
      onRemove: () => update({ productType: undefined }),
    })
  }
  if (filters.badge) activeChips.push({ label: `Badge: ${filters.badge}`, onRemove: () => update({ badge: undefined }) })
  if (filters.discounted) activeChips.push({ label: "On Sale", onRemove: () => update({ discounted: undefined }) })
  if (filters.inStock) activeChips.push({ label: "In Stock", onRemove: () => update({ inStock: undefined }) })
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    activeChips.push({
      label: `Price: $${filters.minPrice ?? 0} - $${filters.maxPrice ?? "max"}`,
      onRemove: () => update({ minPrice: undefined, maxPrice: undefined }),
    })
  }
  
  if (filters.brands && filters.brands.length > 0) {
    filters.brands.forEach((b) =>
      activeChips.push({ label: b, onRemove: () => update({ brands: filters.brands.filter((x) => x !== b) }) })
    )
  }

  if (filters.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach((s) =>
      activeChips.push({ label: `Size: ${s}`, onRemove: () => update({ sizes: filters.sizes.filter((x) => x !== s) }) })
    )
  }

  if (filters.colors && filters.colors.length > 0) {
    filters.colors.forEach((c) =>
      activeChips.push({ label: `Color: ${c}`, onRemove: () => update({ colors: filters.colors.filter((x) => x !== c) }) })
    )
  }

  const resolvedTitle = shopPageTitle(filters.category, filters.subCategory)
  const pageTitle = filters.q
    ? `Search results for "${filters.q}"`
    : filters.brands.length === 1
      ? `${filters.brands[0]} Collection`
      : resolvedTitle
        ? resolvedTitle
        : filters.category
          ? String(filters.category)
          : filters.subCategory
            ? `${filters.subCategory}`
            : "Shop all"

  const activeBanner = shopCategoryBanner(filters.category, filters.subCategory)

  return (
    <div className="bg-surface min-h-screen text-primary-text">
      <Suspense fallback={null}>
        <DepartmentTabs />
      </Suspense>
      {/* Category Banner if present */}
      {activeBanner && (
        <div className="relative mb-6 aspect-[16/9] min-h-36 w-full overflow-hidden bg-primary-text sm:mb-6 sm:aspect-[3/1] sm:min-h-0 md:aspect-4/1">
          <Image
            src={activeBanner}
            alt={pageTitle}
            fill
            priority
            className="object-cover opacity-85"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-t from-primary-text/80 via-primary-text/40 to-transparent px-4">
            <h1 className="line-clamp-2 px-3 text-center text-lg font-black uppercase tracking-tight text-white drop-shadow sm:text-3xl md:text-5xl">
              {pageTitle}
            </h1>
          </div>
        </div>
      )}

      <div className="store-container py-5 sm:py-8">
        {/* Breadcrumb & Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-muted no-scrollbar">
            <Link href="/" className="hover:text-brand transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-brand transition-colors">Shop</Link>
            {filters.category && (
              <>
                <span>/</span>
                <span className="font-semibold text-primary-text">
                  {resolvedTitle || filters.category}
                </span>
              </>
            )}
            {!filters.category && filters.subCategory && (
              <>
                <span>/</span>
                <span className="font-semibold text-primary-text">
                  {shopPageTitle(undefined, filters.subCategory) || filters.subCategory}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-black uppercase tracking-tight text-primary-text sm:text-2xl md:text-3xl">
                {pageTitle}
              </h1>
              <p className="mt-1 text-xs text-subtext">
                Showing {products.length} {products.length === 1 ? "product" : "products"}
              </p>
            </div>

            {/* Filter Toggle & Sorting */}
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white px-4 text-xs font-bold uppercase tracking-wider text-primary-text shadow-xs hover:border-brand sm:flex-none lg:hidden"
              >
                <SlidersHorizontal size={14} className="text-brand" />
                <span>Filters {activeChips.length > 0 && `(${activeChips.length})`}</span>
              </button>

              {/* Desktop Toggle Sidebar */}
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                className="hidden h-11 items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 text-xs font-bold uppercase tracking-wider text-primary-text shadow-xs transition-all hover:border-brand lg:flex"
              >
                <SlidersHorizontal size={14} className="text-brand" />
                <span>{desktopSidebarOpen ? "Hide Filters" : "Show Filters"}</span>
              </button>

              {/* Sort Selector */}
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <select
                  value={filters.sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border border-border-subtle bg-white px-3 pr-8 text-xs font-semibold text-primary-text shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 sm:w-auto"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-subtext">Active filters:</span>
              {activeChips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand border border-brand/20"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="text-brand/70 hover:text-brand"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-brand underline underline-offset-4 hover:text-brand-dark"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <ShopSubcategoryStrip filters={filters} products={products} />

        {/* Main Grid + Sidebar Content Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">
          {/* Desktop Left Sidebar */}
          {desktopSidebarOpen && (
            <aside className="hidden lg:block">
              <div className="sticky top-32 rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
                <FilterPanel filters={filters} products={products} />
              </div>
            </aside>
          )}

          {/* Product Grid */}
          <main className={desktopSidebarOpen ? "" : "lg:col-span-2"}>
            {filters.productType === "dresses" ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Women · Dresses</p>
                <p className="mt-3 font-serif text-3xl font-bold tracking-tight text-primary-text sm:text-4xl">
                  Coming soon
                </p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-subtext">
                  Dresses aren&apos;t available in the shop yet. Browse other women styles while we finish this edit.
                </p>
                <button
                  type="button"
                  onClick={() => update({ productType: undefined })}
                  className="mt-5 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110"
                  style={{ background: "#7A1F2B" }}
                >
                  Browse women
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center shadow-xs">
                <p className="text-lg font-bold text-primary-text">No products found</p>
                <p className="mt-1 text-xs text-subtext">
                  Try Clothes (winter) or Home (curtains &amp; pillow covers), or clear your filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-4 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110"
                  style={{ background: "#7A1F2B" }}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-2 gap-3 sm:gap-6 ${desktopSidebarOpen ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"}`}>
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    compareEnabled={compareEnabled}
                    compared={compareIds.includes(p.id)}
                    onCompareToggle={(prod) => {
                      setCompareIds((prev) =>
                        prev.includes(prod.id) ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                      )
                    }}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Modal Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div ref={filterDialogRef} tabIndex={-1} className="outline-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-primary-text/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileFilterOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-md flex-col bg-white text-primary-text shadow-2xl lg:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-text">
                  Filters &amp; Refinements
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-primary-text"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <FilterPanel
                  filters={filters}
                  products={products}
                  onFilterChange={() => setMobileFilterOpen(false)}
                />
              </div>
              <div className="border-t border-border-subtle p-4 bg-surface">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md"
                  style={{ background: "#7A1F2B" }}
                >
                  View {products.length} Results
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare Bar */}
      {compareEnabled && comparedProducts.length > 0 && (
        <CompareBar
          products={comparedProducts}
          onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
          onClear={() => setCompareIds([])}
        />
      )}
    </div>
  )
}
