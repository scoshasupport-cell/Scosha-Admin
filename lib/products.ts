import type { Product } from "@/types/ecommerce"
import demoRaw from "@/lib/demo-catalog.json"
import { enrichProductTyping } from "@/lib/product-types"

/** Demo/static catalog used when the Scosha API is offline (Amaz-style fallback). */
export const PRODUCTS: Product[] = (demoRaw as unknown as Product[]).map((p) => enrichProductTyping(p))

export function getProduct(handle: string): Product | undefined {
  const key = handle.trim().toLowerCase()
  return PRODUCTS.find(
    (p) => p.handle.toLowerCase() === key || p.id.toLowerCase() === key,
  )
}

export function getProductsByIds(ids: string[]): Product[] {
  return ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as Product[]
}
