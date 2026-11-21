import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { parseFilters } from "@/lib/filters"
import { ShopClient } from "@/components/shop/shop-client"

export const metadata: Metadata = {
  title: "Shop All | Scosha",
  description: "Browse every Scosha product across clothes, home, and more — all departments in one place.",
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseFilters(params)

  // Skincare / Electronics are coming-soon pages, not shop catalogs yet
  const cat = (filters.category || "").toLowerCase()
  if (cat === "skincare") redirect("/skincare")
  if (cat === "electronics") redirect("/electronics")

  return <ShopClient filters={filters} />
}
