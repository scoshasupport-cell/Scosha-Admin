"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useProduct } from "@/hooks/useCatalog"
import { ProductDetailView } from "@/components/product/product-detail-view"
import { ProductDetailSkeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"
import type { Product } from "@/types/ecommerce"

export function ProductDetailClient({
  handle,
  fallback,
}: {
  handle: string
  fallback?: Product
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data, isLoading, isError, error } = useProduct(handle)
  const product = data?.product || fallback

  // Canonicalize legacy ama/pup URLs → sco handle (Scosha-only).
  // Only while this PDP is still the active route — never steal /checkout etc.
  useEffect(() => {
    if (!pathname?.startsWith("/product/")) return
    if (/-(ama|pup)-/i.test(handle)) {
      router.replace(`/product/${handle.replace(/-(ama|pup)-/gi, "-sco-")}`)
      return
    }
    if (!product?.handle) return
    if (product.handle !== handle) {
      router.replace(`/product/${product.handle}`)
    }
  }, [pathname, product?.handle, handle, router])

  if (isLoading && !product) {
    return (
      <main className="py-4 md:py-8">
        <ProductDetailSkeleton />
      </main>
    )
  }

  if (!product) {
    const status = error instanceof ApiError ? error.status : 0
    const missing = !isError || status === 404
    return (
      <main className="store-container py-16 text-center">
        <h1 className="text-2xl font-bold">{missing ? "Product not found" : "Couldn't load this product"}</h1>
        <p className="mt-2 text-sm text-muted">
          {missing ? "This item is not in the catalog." : "Refresh the page to try again."}
        </p>
        <Link href="/shop" className="mt-4 inline-block text-brand underline">
          Back to shop
        </Link>
      </main>
    )
  }

  return <ProductDetailView product={product} />
}
