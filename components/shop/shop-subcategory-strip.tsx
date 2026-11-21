"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Product } from "@/types/ecommerce"
import type { FilterState } from "@/lib/filters"
import { buildQuery } from "@/lib/filters"
import {
  buildChannelSubcategories,
  channelFromFilters,
  type MainChannel,
} from "@/lib/product-types"
import { PRODUCTS } from "@/lib/products"
import { cn } from "@/lib/utils"

const CHANNEL_LABEL: Record<MainChannel, string> = {
  women: "Women",
  men: "Men",
  kids: "Kids",
  shoes: "Shoes",
  accessories: "Accessories",
  home: "Home",
  clothes: "Clothes",
}

/** Horizontal chip strip — tap navigates; light horizontal drag only scrolls. */
export function ShopSubcategoryStrip({
  filters,
  products,
}: {
  filters: FilterState
  products: Product[]
}) {
  const router = useRouter()
  const channel = channelFromFilters(filters.category, filters.subCategory)
  const pool = products.length >= 8 ? products : PRODUCTS

  const subs = useMemo(() => {
    if (!channel || channel === "clothes") return []
    return buildChannelSubcategories(channel, pool)
  }, [channel, pool])

  if (!channel || channel === "clothes" || subs.length < 2) return null

  const allHref = (() => {
    const q = buildQuery({ ...filters, productType: undefined })
    return q ? `/shop?${q}` : "/shop"
  })()

  function go(href: string) {
    router.push(href, { scroll: false })
  }

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 shrink-0 touch-manipulation select-none items-center rounded-full border px-3.5 text-xs font-semibold transition",
      active
        ? "border-brand bg-brand text-white"
        : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand",
    )

  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        Shop {CHANNEL_LABEL[channel]} by type
      </p>
      <div className="no-scrollbar relative z-10 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        <button
          type="button"
          onClick={() => go(allHref)}
          className={chipClass(!filters.productType)}
        >
          All
        </button>
        {subs.map((sub) => {
          const active = filters.productType === sub.slug
          const href = `/shop?${buildQuery({ ...filters, productType: sub.slug })}`
          return (
            <button
              key={sub.slug}
              type="button"
              onClick={() => go(href)}
              className={chipClass(active)}
            >
              {sub.label}
              <span className="ml-1 opacity-70">({sub.count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
