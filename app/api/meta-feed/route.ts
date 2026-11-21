import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

type FeedVariant = {
  stock?: number
  status?: string
  price?: number
  images?: string[]
}

type FeedProduct = {
  id?: number | string
  name?: string
  slug?: string
  description?: string
  basePrice?: number
  images?: string[]
  status?: string
  brandId?: { name?: string } | string | null
  specs?: Record<string, unknown> | null
  variants?: FeedVariant[]
}

type ApiList = {
  success?: boolean
  data?: FeedProduct[]
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    hasNext?: boolean
  }
}

const META_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
] as const

function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.STOREFRONT_URL ||
    "https://scosha.com"
  return raw.replace(/\/$/, "")
}

function currencyCode(): string {
  return (process.env.NEXT_PUBLIC_META_FEED_CURRENCY || "USD").trim().toUpperCase() || "USD"
}

function backendBase(): string {
  return (
    process.env.META_FEED_API_URL ||
    process.env.NEXT_PUBLIC_API_PROXY ||
    "http://127.0.0.1:5000"
  ).replace(/\/$/, "")
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/** Meta TSV: no tabs/newlines inside fields. */
function cell(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim()
}

function absoluteImage(src?: string | null): string | null {
  if (!src) return null
  const s = src.trim()
  if (!s || s.includes("placeholder")) return null
  if (s.startsWith("//")) return `https:${s}`
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith("/")) return `${siteUrl()}${s}`
  return null
}

function brandName(product: FeedProduct): string {
  if (product.brandId && typeof product.brandId === "object" && product.brandId.name) {
    return product.brandId.name
  }
  return "Scosha"
}

function stockTotal(product: FeedProduct): number {
  const variants = product.variants || []
  if (!variants.length) return 0
  return variants.reduce((sum, v) => {
    if (v.status && v.status !== "active") return sum
    return sum + Math.max(0, Number(v.stock) || 0)
  }, 0)
}

function productPrice(product: FeedProduct): number {
  const variants = (product.variants || []).filter((v) => !v.status || v.status === "active")
  const priced = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0)
  if (priced.length) return Math.min(...priced)
  const base = Number(product.basePrice)
  return Number.isFinite(base) && base > 0 ? base : 0
}

function formatPrice(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}

function firstImage(product: FeedProduct): string | null {
  for (const src of product.images || []) {
    const abs = absoluteImage(src)
    if (abs) return abs
  }
  for (const v of product.variants || []) {
    for (const src of v.images || []) {
      const abs = absoluteImage(src)
      if (abs) return abs
    }
  }
  return null
}

async function fetchAllProducts(): Promise<FeedProduct[]> {
  const base = backendBase()
  const all: FeedProduct[] = []
  let page = 1
  const limit = 500

  for (;;) {
    const url = `${base}/api/v1/products?limit=${limit}&page=${page}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(`Product API failed (${res.status}) at ${url}`)
    }
    const json = (await res.json()) as ApiList
    const batch = Array.isArray(json.data) ? json.data : []
    all.push(...batch)

    const hasNext = Boolean(json.meta?.hasNext)
    const totalPages = Number(json.meta?.totalPages) || 1
    if (!hasNext || page >= totalPages || batch.length === 0) break
    page += 1
    if (page > 50) break // safety
  }

  return all
}

function toRow(product: FeedProduct, currency: string, origin: string): string[] | null {
  if (!product?.slug || !product?.name) return null
  if (product.status && product.status !== "active") return null

  const image = firstImage(product)
  if (!image) return null

  const price = productPrice(product)
  if (!(price > 0)) return null

  const stock = stockTotal(product)
  const description =
    stripHtml(product.description || "") ||
    stripHtml(String(product.specs?.["SEO description"] || "")) ||
    product.name

  return [
    cell(product.id ?? product.slug),
    cell(product.name),
    cell(description.slice(0, 5000)),
    cell(stock > 0 ? "in stock" : "out of stock"),
    cell("new"),
    cell(formatPrice(price, currency)),
    cell(`${origin}/product/${product.slug}`),
    cell(image),
    cell(brandName(product)),
  ]
}

export async function GET() {
  try {
    const origin = siteUrl()
    const currency = currencyCode()
    const products = await fetchAllProducts()
    const rows = products
      .map((p) => toRow(p, currency, origin))
      .filter((r): r is string[] => Array.isArray(r))

    const lines = [META_COLUMNS.join("\t"), ...rows.map((r) => r.join("\t"))]
    const body = `${lines.join("\n")}\n`

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        "X-Meta-Feed-Count": String(rows.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Meta feed failed"
    return NextResponse.json({ success: false, message }, { status: 502 })
  }
}
