import type { Product, ProductColor, ProductVariant, CartLine } from "@/types/ecommerce"
import { filterNonAmazonImages, productImageSrc, productImages } from "@/lib/images"
import { isPlaceholderColorName } from "@/lib/utils"
import { enrichProductTyping } from "@/lib/product-types"

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(String(a).toUpperCase())
    const ib = SIZE_ORDER.indexOf(String(b).toUpperCase())
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return String(a).localeCompare(String(b))
  })
}

export interface ApiColor {
  name: string
  hex?: string
}

export interface ApiVariant {
  id?: number | string
  _id?: string
  productId?: string | number
  color?: ApiColor
  colorName?: string
  colorHex?: string
  size: string
  sku?: string
  price: number
  comparePrice?: number | null
  stock: number
  images?: string[]
  status?: string
}

export interface ApiBrandRef {
  id?: number | string
  _id?: string
  name?: string
  slug?: string
}

export interface ApiCategoryRef {
  id?: number | string
  _id?: string
  name?: string
  slug?: string
}

export interface ApiProduct {
  id?: number | string
  _id?: string
  name: string
  slug: string
  description?: string
  details?: string[]
  specs?: Record<string, string>
  brandId?: ApiBrandRef | string | number
  categoryId?: ApiCategoryRef | string | number
  subCategoryId?: ApiCategoryRef | string | number | null
  basePrice: number
  comparePrice?: number | null
  images?: string[]
  tags?: string[]
  status?: string
  badge?: string | null
  ratingAvg?: number
  reviewCount?: number
  featured?: boolean
  trending?: boolean
  newArrival?: boolean
  bestSeller?: boolean
  variants?: ApiVariant[]
  createdAt?: string
}

export interface ApiBrand {
  id?: number | string
  _id?: string
  name: string
  slug: string
  logo?: string
  productCount?: number
  count?: number
}

export interface ApiCategory {
  id?: number | string
  _id?: string
  name: string
  slug: string
  parentId?: string | null
  children?: ApiCategory[]
  subcategories?: ApiCategory[]
}

export interface ApiCartItem {
  itemId?: string
  id?: string | number
  _id?: string
  variantId?: ApiVariant | string
  productId?: ApiProduct | string
  quantity: number
  color?: string
  size?: string
  unitPrice?: number
  lineTotal?: number
  availableStock?: number
  maxQuantity?: number
  inStock?: boolean
}

export interface ApiCart {
  _id?: string
  id?: string | number
  items: ApiCartItem[]
  itemCount: number
  subtotal: number
  stockAdjusted?: boolean
  stockMessages?: string[]
}

export interface ApiAddress {
  id?: number | string
  _id?: string
  name: string
  phone: string
  email?: string
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
  isDefault?: boolean
}

export interface ApiOrder {
  id?: number | string
  _id?: string
  orderNumber: string
  items: Array<{
    productId?: string
    variantId?: string
    name?: string
    slug?: string
    image?: string
    color?: string
    size?: string
    quantity: number
    price: number
    lineTotal?: number
  }>
  shippingAddress?: ApiAddress & Record<string, unknown>
  deliveryMethod?: "standard" | "express"
  shippingCharge?: number
  tax?: number
  couponCode?: string | null
  couponDiscount?: number
  subtotal: number
  total: number
  status: string
  paymentMethod?: string
  notes?: string
  trackingNumber?: string | null
  createdAt?: string
  vipUnlocked?: boolean
  vipReward?: {
    granted: boolean
    isNewVip?: boolean
    wasVip?: boolean
    discountPercent?: number
    creditsAdded?: number
    freeDeliveryCredits?: number
  } | null
}

export interface ApiUser {
  id?: number | string
  _id?: string
  name: string
  email: string
  phone?: string
  gender?: string | null
  preferredSize?: string | null
  isEmailVerified?: boolean
  status?: string
  isVip?: boolean
  vipUnlockedAt?: string | null
  vipPendingDiscountPercent?: number
  freeDeliveryCredits?: number
  vipCongratsSeen?: boolean
  vipEarlyAccess?: boolean
}

export function apiEntityId(
  value: { id?: number | string; _id?: string } | string | number | null | undefined,
): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (value.id != null) return String(value.id)
  if (value._id != null) return String(value._id)
  return ""
}

export function withApiId<T extends { id?: number | string; _id?: string }>(
  entity: T,
): T & { id: string } {
  return { ...entity, id: apiEntityId(entity) }
}

function asRecord(value: unknown): Record<string, string> {
  if (!value) return {}
  if (value instanceof Map) return Object.fromEntries(value.entries())
  if (typeof value === "object") return value as Record<string, string>
  return {}
}

function categorySlug(p: ApiProduct): string {
  if (typeof p.categoryId === "object" && p.categoryId?.slug) return p.categoryId.slug
  return "clothes"
}

function categoryName(p: ApiProduct): string {
  if (typeof p.categoryId === "object" && p.categoryId?.name) return p.categoryId.name
  return "Clothes"
}

function subcategorySlug(p: ApiProduct): string {
  if (typeof p.subCategoryId === "object" && p.subCategoryId?.slug) {
    return p.subCategoryId.slug
  }
  return ""
}

function subcategoryName(p: ApiProduct): string {
  if (typeof p.subCategoryId === "object" && p.subCategoryId?.name) return p.subCategoryId.name
  return ""
}

function brandName(p: ApiProduct): string {
  if (typeof p.brandId === "object" && p.brandId?.name) {
    const name = p.brandId.name.trim()
    if (name.toLowerCase() === "amaz" || name.toLowerCase().includes("pupasita")) return "Scosha"
    return name
  }
  return "Scosha"
}

function brandSlug(p: ApiProduct): string {
  if (typeof p.brandId === "object" && p.brandId?.slug) {
    const slug = p.brandId.slug.toLowerCase()
    if (slug === "amaz" || slug.includes("pupasita")) return ""
    return p.brandId.slug
  }
  return ""
}

function departmentFromCategory(slug: string): Product["department"] {
  if (slug === "furniture") return "clothes" // furniture products still use clothes dept styling in UI
  if (slug === "skincare") return "skincare"
  if (slug === "electronics") return "electronics"
  return "clothes"
}

function catalogImages(product: ApiProduct, urls: string[] | undefined | null): string[] {
  const list = (urls ?? []).filter(Boolean).map(String)
  if (categorySlug(product) === "furniture") return list
  return filterNonAmazonImages(list)
}

function variantColorName(v: ApiVariant): string {
  return v.color?.name || v.colorName || "Default"
}

function variantColorHex(v: ApiVariant): string {
  return v.color?.hex || v.colorHex || "#111111"
}

function parseSpecSizes(product: ApiProduct): string[] {
  const specs = asRecord(product.specs)
  const fromAvail = String(specs["Available sizes"] || "")
    .split(/[,|/]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const sheet = String(specs["Sheet size"] || "").trim()
  const raw = fromAvail.length ? fromAvail : sheet ? [sheet] : []
  return sortSizes([
    ...new Set(
      raw
        .map((s) => s.toUpperCase())
        .filter((s) => s && s !== "OS" && s !== "ONESIZE" && s !== "ONE-SIZE"),
    ),
  ])
}

const HIDDEN_SPEC_KEYS =
  /^(source\s*url|source|amazon\s*url|external\s*url|sheet\s*size|sheet\s*group)$/i

function normalizeSpecs(specs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(specs)) {
    if (HIDDEN_SPEC_KEYS.test(key.trim())) continue
    out[key] = value
  }
  if (out.SKU) {
    out.SKU = String(out.SKU)
      .replace(/^(PUP|AMA)-/i, "SCO-")
      .replace(/^(pup|ama)(?=-)/i, "SCO")
  }
  return out
}

/** Map Scosha API product → storefront Product shape. */
export function mapApiProduct(product: ApiProduct): Product {
  const variantsRaw = (product.variants ?? []).filter((v) => v.status !== "inactive")
  const catSlug = categorySlug(product)
  const images = catalogImages(product, product.images)
  const fromVariants = sortSizes([...new Set(variantsRaw.map((v) => v.size).filter(Boolean))])
  const fromSpecs = parseSpecSizes(product)
  const sizes = sortSizes(fromVariants.length ? fromVariants : fromSpecs.length ? fromSpecs : [])

  const colorMap = new Map<string, ProductColor>()
  for (const v of variantsRaw) {
    const name = variantColorName(v)
    if (colorMap.has(name)) continue
    const vImgs = catalogImages(product, v.images)
    const imgs = (vImgs.length ? vImgs : images).map(productImageSrc).filter(Boolean)
    const merged = [...imgs]
    for (const img of images) {
      const src = productImageSrc(img)
      if (src && !merged.includes(src)) merged.push(src)
    }
    colorMap.set(name, {
      name,
      hex: variantColorHex(v),
      image: merged[0] || "",
      image2: merged[1] || merged[0] || "",
      images: merged,
    })
  }
  if (colorMap.size === 0) {
    const fallback = images.map(productImageSrc).filter(Boolean)
    colorMap.set("Default", {
      name: "Default",
      hex: "#111111",
      image: fallback[0] || "",
      image2: fallback[1] || fallback[0] || "",
      images: fallback,
    })
  }
  const colors = [...colorMap.values()]

  const variants: ProductVariant[] = variantsRaw.map((v) => {
    const id = apiEntityId(v)
    const color = variantColorName(v)
    const stock = Math.max(0, Number(v.stock) || 0)
    return {
      id,
      title: [color, v.size].filter(Boolean).join(" / ") || "Default",
      size: v.size,
      colorName: color,
      shadeHex: variantColorHex(v),
      inStock: stock > 0,
      stock,
      price: Number(v.price),
    }
  })

  const stockTotal = variantsRaw.reduce((s, v) => s + Math.max(0, Number(v.stock) || 0), 0)
  const resolvedImages = productImages(images.length ? images : colors.map((c) => c.image))

  const scoHandle = String(product.slug || "")
    .replace(/-(ama|pup)-/gi, "-sco-")
    .trim()

  return enrichProductTyping({
    id: apiEntityId(product),
    title: (product.name || "")
      .replace(/pupasita\s*/gi, "")
      .replace(/\bAMA\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
    handle: scoHandle,
    brand: brandName(product),
    category: categoryName(product),
    categorySlug: catSlug,
    subCategory: subcategoryName(product) || subcategorySlug(product),
    subCategorySlug: subcategorySlug(product) || undefined,
    department: departmentFromCategory(catSlug),
    price: Number(product.basePrice),
    compareAtPrice: product.comparePrice != null ? Number(product.comparePrice) : undefined,
    stock: stockTotal,
    inStock: variants.length ? variants.some((v) => v.inStock) : product.status !== "archived",
    currency: "USD",
    images: resolvedImages,
    variants,
    colors,
    sizes: sizes.length ? sizes : ["One Size"],
    description: (product.description || "").replace(/pupasita\s*/gi, "").trim(),
    details: Array.isArray(product.details) ? product.details : [],
    specs: normalizeSpecs(asRecord(product.specs)),
    rating: product.ratingAvg ?? 0,
    reviewCount: product.reviewCount ?? 0,
    badge: product.badge ?? undefined,
    createdAt: product.createdAt,
  })
}

export function mapApiProducts(list: ApiProduct[] = []): Product[] {
  return list.map(mapApiProduct)
}

export function mapApiBrand(b: ApiBrand) {
  return {
    slug: b.slug,
    name: b.name,
    logo: b.logo,
    count: b.productCount ?? b.count ?? 0,
  }
}

export function mapApiCategory(c: ApiCategory) {
  const kids = c.children ?? c.subcategories ?? []
  return {
    slug: c.slug,
    name: c.name,
    subcategories: kids.map((s) => ({
      slug: s.slug,
      name: s.name,
    })),
  }
}

export function findVariantId(product: Product, size?: string, color?: string): string | null {
  const inStockQty = (v: ProductVariant) => Boolean(v.inStock) && (v.stock ?? 0) > 0
  const variants = product.variants
  if (!variants?.length) return null

  const normalize = (v: string | undefined | null) => {
    if (!v) return ""
    const s = String(v).trim().toUpperCase().replace(/\s+/g, "")
    if (s === "2XL") return "XXL"
    if (s === "3XL") return "XXXL"
    return s
  }

  const s = normalize(size)
  const c = color ?? product.colors?.[0]?.name

  let match: ProductVariant | undefined
  if (s) {
    const bySize = variants.filter((v) => normalize(v.size) === s)
    if (!bySize.length) return null
    const byColor = bySize.filter((v) => !c || !v.colorName || v.colorName === c)
    match = byColor.find(inStockQty) || byColor[0] || bySize[0]
  } else {
    match = variants.find(inStockQty) || variants[0]
  }
  // Never add an out-of-stock size when another size of the same color is available
  if (match && !inStockQty(match)) {
    const fallback = variants.find(
      (v) => inStockQty(v) && (!c || !v.colorName || v.colorName === c),
    )
    if (fallback) match = fallback
  }
  return match?.id || null
}

export function cartItemImage(item: ApiCartItem): string {
  const variant = typeof item.variantId === "object" && item.variantId ? item.variantId : null
  const product = typeof item.productId === "object" && item.productId ? item.productId : null
  return variant?.images?.[0] || product?.images?.[0] || ""
}

export function cartItemName(item: ApiCartItem): string {
  const product = typeof item.productId === "object" && item.productId ? item.productId : null
  return product?.name || "Item"
}

export function cartItemSlug(item: ApiCartItem): string {
  const product = typeof item.productId === "object" && item.productId ? item.productId : null
  return product?.slug || ""
}

export function cartItemPrice(item: ApiCartItem): number {
  if (typeof item.unitPrice === "number") return item.unitPrice
  const variant = typeof item.variantId === "object" && item.variantId ? item.variantId : null
  const product = typeof item.productId === "object" && item.productId ? item.productId : null
  return variant?.price ?? product?.basePrice ?? 0
}

export function cartItemId(item: ApiCartItem): string {
  if (item.itemId != null && item.itemId !== "") return String(item.itemId)
  if (typeof item.variantId === "object" && item.variantId) {
    return String(item.variantId.id ?? item.variantId._id ?? "")
  }
  if (typeof item.variantId === "string" || typeof item.variantId === "number") {
    return String(item.variantId)
  }
  if (item.id != null && item.id !== "") return String(item.id)
  return ""
}

export function mapCartItemToLine(item: ApiCartItem): CartLine {
  const product = typeof item.productId === "object" && item.productId ? item.productId : null
  const variant = typeof item.variantId === "object" && item.variantId ? item.variantId : null
  return {
    productId: apiEntityId(item.productId),
    variantId: cartItemId(item),
    title: cartItemName(item),
    variantTitle: [item.color || variant?.color?.name, item.size || variant?.size]
      .filter(Boolean)
      .join(" / "),
    brand: typeof product?.brandId === "object" ? brandName(product) : "Scosha",
    image: cartItemImage(item),
    price: cartItemPrice(item),
    quantity: item.quantity,
    handle: cartItemSlug(item),
    size: item.size || variant?.size,
    color: item.color || variant?.color?.name || variant?.colorName,
  }
}

/** Extract shop facet options from loaded products (same catalog as Amaz). */
export function catalogFacets(products: Product[]) {
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort()
  const sizes = sortSizes([...new Set(products.flatMap((p) => p.sizes || []))])
  const colors = [...new Map(
    products
      .flatMap((p) => p.colors || [])
      .filter((c) => !isPlaceholderColorName(c.name))
      .map((c) => [c.name, c]),
  ).values()]
  const subCategories = [...new Set(products.map((p) => p.subCategory).filter(Boolean))].sort()
  const maxPrice = products.reduce((m, p) => Math.max(m, p.price), 0)
  return { brands, sizes, colors, subCategories, maxPrice: Math.max(maxPrice, 250) }
}
