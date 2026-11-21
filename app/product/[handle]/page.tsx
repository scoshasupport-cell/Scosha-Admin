import type { Metadata } from "next"
import { ProductDetailClient } from "@/components/product/product-detail-client"

interface ProductPageProps {
  params: Promise<{ handle: string }>
}

function titleFromHandle(handle: string): string {
  return handle
    .replace(/-(ama|pup|sco)-[a-z]+-\d+\s*$/i, "")
    .replace(/-/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { handle } = await params
  const pretty = titleFromHandle(handle)
  return {
    title: `${pretty || "Product"} | Scosha`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params
  return <ProductDetailClient handle={handle} />
}
