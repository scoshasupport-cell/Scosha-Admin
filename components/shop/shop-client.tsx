"use client"

import { ShopView } from "@/components/shop/shop-view"
import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton"
import { useShopProducts } from "@/hooks/useCatalog"
import type { FilterState } from "@/lib/filters"

export function ShopClient({ filters }: { filters: FilterState }) {
  const { data, isLoading, isError, isFetching } = useShopProducts(filters)
  const products = data?.products ?? []

  if (isLoading && !isError && products.length === 0 && isFetching) {
    return (
      <main className="store-container py-8 md:py-10">
        <div className="mb-6 space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <ProductGridSkeleton count={8} />
      </main>
    )
  }

  if (isError) {
    return (
      <main className="store-container py-16 text-center space-y-3">
        <h1 className="text-2xl font-bold">Couldn&apos;t load the catalog</h1>
        <p className="text-sm text-muted">
          The shop shows live stock only. Refresh the page to try again.
        </p>
      </main>
    )
  }

  return <ShopView filters={filters} products={products} />
}
