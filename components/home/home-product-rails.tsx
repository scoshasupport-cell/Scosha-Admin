"use client"

import { ProductRail, type ProductRailData } from "@/components/home/product-rail"
import { ProductRailSkeleton } from "@/components/ui/skeleton"
import { useHomeRails } from "@/hooks/useCatalog"

export function HomeProductRails() {
  const { data, isLoading } = useHomeRails()

  if (isLoading && !data) {
    return (
      <div className="store-container space-y-14 py-12">
        <ProductRailSkeleton count={4} />
        <ProductRailSkeleton count={4} />
      </div>
    )
  }

  const featured = data?.featured ?? []
  const newest = data?.newest ?? []
  const deals = data?.deals ?? []

  const rails: ProductRailData[] = [
    {
      id: "new-arrivals",
      title: "New Arrivals",
      viewAllHref: "/shop?sort=newest",
      products: (newest.length ? newest : featured).slice(0, 10),
    },
    {
      id: "featured",
      title: "Featured Collection",
      viewAllHref: "/shop",
      products: featured.slice(0, 12),
    },
    {
      id: "value-deals",
      title: "Best Value",
      viewAllHref: "/shop?sort=price-asc",
      products: (deals.length ? deals : featured).slice(0, 8),
    },
  ].filter((r) => r.products.length > 0)

  if (!rails.length) {
    return (
      <div className="store-container py-12 text-center text-sm text-muted">
        Couldn&apos;t load products. Refresh the page to try again.
      </div>
    )
  }

  return (
    <>
      {rails.map((rail) => (
        <ProductRail key={rail.id} rail={rail} />
      ))}
    </>
  )
}
