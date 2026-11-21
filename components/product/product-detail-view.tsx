"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Minus, Plus, Truck, RotateCcw, ShieldCheck, Ruler, X, Check } from "lucide-react"
import type { Product, ProductColor } from "@/types/ecommerce"
import { Price } from "@/components/price"
import { useShopWishlist } from "@/hooks/useShopWishlist"
import { useBagCart } from "@/hooks/useBagCart"
import { useProducts } from "@/hooks/useCatalog"
import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/ui/skeleton"
import { getChartForProduct, SIZE_GUIDE_TIP, SIZE_MEASURE_TIPS } from "@/lib/size-guide"
import { cn, isPlaceholderColorName, visibleProductColors } from "@/lib/utils"
import { SCOSHA_CONTACT } from "@/lib/contact"
import { productDepartmentDisplay } from "@/lib/product-types"

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

export function ProductDetailView({ product }: { product: Product }) {
  const department = useMemo(() => productDepartmentDisplay(product), [product])
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>(
    product.colors?.[0]
  )
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    const sizes = product.sizes?.length ? product.sizes : ["M"]
    const inStockSize = sizes.find((size) =>
      product.variants?.some(
        (v) => v.size === size && Boolean(v.inStock) && (v.stock ?? 0) > 0,
      ),
    )
    return inStockSize || sizes[0] || "M"
  })
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [addedToast, setAddedToast] = useState(false)

  const { addProduct } = useBagCart()
  const wishlist = useShopWishlist()
  const isWished = wishlist.isWished(product.id)
  const [tryOnReady, setTryOnReady] = useState(false)

  const relatedQuery = useProducts({ category: product.category, limit: 8 })
  const related = useMemo(() => {
    const fromApi = (relatedQuery.data?.products ?? []).filter((p) => p.id !== product.id)
    return fromApi.slice(0, 4)
  }, [relatedQuery.data?.products, product.id])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    description: true,
    details: true,
    shipping: false,
  })

  // Full gallery: color-specific shots first, then remaining product images (never cap at 2)
  const currentImages = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    const push = (url?: string | null) => {
      const u = typeof url === "string" ? url.trim() : ""
      if (!u || seen.has(u)) return
      seen.add(u)
      out.push(u)
    }
    const colorGallery =
      selectedColor?.images?.filter(Boolean) ??
      ([selectedColor?.image, selectedColor?.image2].filter(Boolean) as string[])
    for (const img of colorGallery) push(img)
    for (const img of product.images || []) push(img)
    return out.length ? out : ["/placeholder.svg"]
  }, [product.images, selectedColor])

  const mainImage = currentImages[activeImageIdx] || currentImages[0] || "/placeholder.svg"

  const activeVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) =>
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor?.name || !v.colorName || v.colorName === selectedColor.name),
      ) ||
      product.variants.find((v) => !selectedSize || v.size === selectedSize) ||
      product.variants[0]
    )
  }, [product.variants, selectedSize, selectedColor?.name])

  const maxQty = Math.max(
    1,
    activeVariant?.stock ?? (activeVariant?.inStock === false ? 0 : 10),
  )
  const canAdd = Boolean(activeVariant?.inStock ?? product.inStock)

  function sizeInStock(size: string) {
    const matches = product.variants.filter(
      (v) =>
        v.size === size &&
        (!selectedColor?.name || !v.colorName || v.colorName === selectedColor.name),
    )
    if (!matches.length) return true
    return matches.some((v) => v.inStock)
  }

  const sizeChart = getChartForProduct(product.category, product.subCategory)

  function toggleAccordion(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const displayColors = visibleProductColors(product.colors)
  const cartColor =
    selectedColor?.name && !isPlaceholderColorName(selectedColor.name)
      ? selectedColor.name
      : undefined

  async function handleAddToCart() {
    if (!canAdd) return
    await addProduct(product, {
      size: selectedSize,
      color: cartColor,
      quantity: Math.min(quantity, maxQty),
    })
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 3000)
  }

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0


  return (
    <div className="store-container min-w-0 overflow-x-clip bg-surface py-4 pb-20 text-primary-text sm:py-8 sm:pb-8 md:py-12 md:pb-12">
      {/* Breadcrumb — compact on small screens */}
      <nav aria-label="Breadcrumb" className="mb-4 text-[11px] text-muted sm:mb-6 sm:text-[13px]">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <li className="shrink-0">
            <Link href="/" className="hover:text-brand transition-colors">
              Home
            </Link>
          </li>
          <li className="shrink-0">/</li>
          <li className="shrink-0">
            <Link href="/shop?category=clothes" className="hover:text-brand transition-colors">
              Shop
            </Link>
          </li>
          <li className="hidden shrink-0 sm:inline">/</li>
          <li className="hidden min-w-0 sm:inline">
            <Link href={department.href.split("&productType=")[0]} className="hover:text-brand transition-colors">
              {department.channelLabel}
            </Link>
          </li>
          {department.typeLabel && department.typeSlug !== "other" && department.typeSlug !== "home" && (
            <>
              <li className="hidden shrink-0 md:inline">/</li>
              <li className="hidden min-w-0 md:inline">
                <Link href={department.href} className="hover:text-brand transition-colors">
                  {department.typeLabel}
                </Link>
              </li>
            </>
          )}
          <li className="shrink-0">/</li>
          <li className="min-w-0 flex-1 font-semibold text-primary-text line-clamp-1">{product.title}</li>
        </ol>
      </nav>

      {/* Main Product Display Grid */}
      <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        {/* Left: Photos Gallery */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-2 shadow-sm sm:aspect-square sm:rounded-3xl">
            <Image
              src={mainImage}
              alt={product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover transition duration-500"
              priority
              loading="eager"
              fetchPriority="high"
            />
            {discount > 0 && (
              <span
                className="absolute left-3 top-3 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-brand/25 sm:left-4 sm:top-4 sm:rounded-xl sm:px-3.5 sm:text-xs"
                style={{ background: "#7A1F2B" }}
              >
                -{discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {currentImages.length > 1 && (
            <div className="no-scrollbar -mx-0.5 flex gap-2 overflow-x-auto overscroll-x-contain px-0.5 pb-1 sm:gap-3">
              {currentImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all sm:h-20 sm:w-20 sm:rounded-2xl",
                    activeImageIdx === idx
                      ? "border-brand ring-2 ring-brand/20"
                      : "border-border-subtle hover:border-brand/50"
                  )}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details, Color / Size Selectors & Bag Action */}
        <div className="flex min-w-0 flex-col">
          {/* Brand & Department */}
          <div className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:text-xs">
            <span className="truncate font-black text-brand">{product.brand}</span>
            <Link
              href={department.href}
              className="truncate sm:max-w-[55%] sm:text-right hover:text-brand transition-colors"
            >
              {department.channelLabel}
              {department.typeLabel && department.typeSlug !== "other" && department.typeSlug !== "home"
                ? ` · ${department.typeLabel}`
                : ""}
            </Link>
          </div>

          {/* Title */}
          <h1 className="mt-2 break-words text-[1.05rem] font-bold leading-snug tracking-tight text-primary-text sm:text-lg md:text-xl lg:text-[1.35rem] lg:leading-snug">
            {product.title}
          </h1>

          {/* Price */}
          <div className="mt-4 border-b border-border-subtle pb-5">
            <div className="flex items-baseline gap-3">
              <Price
                amount={product.price}
                className="text-lg font-bold text-primary-text sm:text-xl"
              />
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <Price
                  amount={product.compareAtPrice}
                  className="text-sm text-muted line-through sm:text-base"
                />
              )}
            </div>
          </div>

          {/* Color Selection — hide placeholder-only "Default" colors */}
          {displayColors.length > 0 && (
            <div className="mt-5 border-b border-border-subtle pb-5 sm:mt-6 sm:pb-6">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-primary-text">
                  Color: <span className="font-normal text-subtext">{selectedColor?.name}</span>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 sm:gap-2.5">
                {displayColors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c)
                      setActiveImageIdx(0)
                      setTryOnReady(true)
                    }}
                    title={c.name}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white transition hover:scale-110",
                      selectedColor?.name === c.name
                        ? "ring-2 ring-[var(--color-sale)] ring-offset-2"
                        : "opacity-80"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Selection & Size Guide Trigger */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-5 border-b border-border-subtle pb-5 sm:mt-6 sm:pb-6">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-primary-text">
                  Size: <span className="text-brand">{selectedSize}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-dark sm:gap-1.5 sm:text-xs"
                >
                  <Ruler size={14} />
                  <span>What&apos;s my size?</span>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const available = sizeInStock(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!available}
                      onClick={() => {
                        setSelectedSize(s)
                        setTryOnReady(true)
                      }}
                      className={cn(
                        "h-10 min-w-11 rounded-xl border px-2.5 text-xs font-bold uppercase tracking-wider transition-all sm:min-w-12 sm:px-3",
                        selectedSize === s
                          ? "border-[var(--color-sale)] bg-[var(--color-sale)] text-white shadow-xs"
                          : "border-border-subtle bg-white text-subtext hover:border-[var(--color-sale)] hover:text-[var(--color-sale)]",
                        !available && "cursor-not-allowed opacity-40 line-through"
                      )}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>

              {tryOnReady && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--color-sale)]/25 bg-[var(--color-brand-light)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
                      style={{ background: "#7A1F2B" }}
                    >
                      <Ruler size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-sale)] sm:text-xs">
                        Not sure about size?
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-subtext sm:text-sm">
                        Size {selectedSize}
                        {cartColor ? ` · ${cartColor}` : ""}. Open the size guide to match your measurements.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[10px] font-bold uppercase tracking-wider text-white sm:text-[11px]"
                    style={{ background: "#7A1F2B" }}
                  >
                    <Ruler size={14} />
                    Find My Size
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quantity & Add to Cart — desktop / tablet inline; mobile uses sticky bar */}
          <div className="mt-5 hidden gap-3 sm:mt-6 sm:flex sm:flex-row sm:items-center">
            <div className="flex h-12 w-32 shrink-0 items-center rounded-xl border border-border-subtle bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                className="grid h-full w-10 place-items-center text-subtext transition-colors hover:bg-brand-light hover:text-brand"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="flex-1 text-center text-sm font-bold text-primary-text">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.min(maxQty, v + 1))}
                className="grid h-full w-10 place-items-center text-subtext transition-colors hover:bg-brand-light hover:text-brand"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              disabled={!canAdd}
              onClick={() => void handleAddToCart()}
              className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl px-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 sm:px-6"
              style={{ background: "#7A1F2B" }}
            >
              {canAdd
                ? `Add to Bag • $${(product.price * quantity).toFixed(2)}`
                : "Out of stock"}
            </button>

            <button
              type="button"
              onClick={() => void wishlist.toggle(product.id)}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all",
                isWished
                  ? "border-secondary bg-[#F5F3FF] text-secondary"
                  : "border-border-subtle bg-white text-subtext hover:border-brand hover:text-brand"
              )}
              aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={cn("h-5 w-5", isWished ? "fill-secondary text-secondary" : "")} />
            </button>
          </div>

          {/* Mobile quantity (sticky bar has add + wishlist) */}
          <div className="mt-5 flex items-center gap-3 sm:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text">Qty</span>
            <div className="flex h-11 w-28 items-center rounded-xl border border-border-subtle bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                className="grid h-full w-9 place-items-center text-subtext"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="flex-1 text-center text-sm font-bold text-primary-text">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.min(maxQty, v + 1))}
                className="grid h-full w-9 place-items-center text-subtext"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Toast Alert */}
          {addedToast && (
            <div
              className="mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-bold text-white shadow-md animate-fadeUp"
              style={{ background: "#7A1F2B" }}
            >
              <Check size={16} />
              <span>Added to your bag! Size: {selectedSize}{cartColor ? `, Color: ${cartColor}` : ""}.</span>
            </div>
          )}

          {/* Delivery & Trust Badges */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 rounded-2xl border border-border-subtle bg-white p-3 shadow-xs sm:mt-6 sm:grid-cols-3 sm:gap-2 sm:p-4 sm:text-center">
            <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-0">
              <Truck size={18} className="mb-0 shrink-0 text-brand sm:mb-1" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-primary-text">Fast Delivery</span>
                <span className="block text-[10px] text-muted">Free over $150</span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-border-subtle pt-2.5 sm:flex-col sm:items-center sm:gap-0 sm:border-x sm:border-t-0 sm:pt-0">
              <RotateCcw size={18} className="mb-0 shrink-0 text-brand sm:mb-1" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-primary-text">30-Day Returns</span>
                <span className="block text-[10px] text-muted">Effortless pickup</span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-border-subtle pt-2.5 sm:flex-col sm:items-center sm:gap-0 sm:border-t-0 sm:pt-0">
              <ShieldCheck size={18} className="mb-0 shrink-0 text-brand sm:mb-1" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-primary-text">100% Authentic</span>
                <span className="block text-[10px] text-muted">Direct from label</span>
              </div>
            </div>
          </div>

          {/* Accordions */}
          <div className="mt-5 divide-y divide-border-subtle border-t border-border-subtle sm:mt-6">
            <div className="py-3.5 sm:py-4">
              <button
                type="button"
                onClick={() => toggleAccordion("description")}
                className="flex w-full items-center justify-between gap-3 text-left text-[11px] font-bold uppercase tracking-wider text-primary-text transition-colors hover:text-brand sm:text-xs"
              >
                <span className="min-w-0 pr-2">Description</span>
                <span className="shrink-0 text-brand">{openSections.description ? "−" : "+"}</span>
              </button>
              {openSections.description && (
                <div className="mt-3 break-words text-xs leading-relaxed text-subtext">
                  <p>{product.description}</p>
                  {product.details && product.details.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-4">
                      {product.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="py-3.5 sm:py-4">
              <button
                type="button"
                onClick={() => toggleAccordion("details")}
                className="flex w-full items-center justify-between gap-3 text-left text-[11px] font-bold uppercase tracking-wider text-primary-text transition-colors hover:text-brand sm:text-xs"
              >
                <span className="min-w-0 pr-2">Fabric &amp; Care</span>
                <span className="shrink-0 text-brand">{openSections.details ? "−" : "+"}</span>
              </button>
              {openSections.details && (
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-subtext sm:grid-cols-2">
                  {product.specs ? (
                    Object.entries(product.specs)
                      .filter(([k]) => !/^(source\s*url|source|amazon\s*url|external\s*url|sheet\s*size|sheet\s*group)$/i.test(k.trim()))
                      .map(([k, v]) => (
                      <div key={k} className="min-w-0 break-words border-b border-surface-2 pb-1">
                        <span className="font-semibold text-primary-text">{k}:</span> {v}
                      </div>
                    ))
                  ) : (
                    <>
                      <div><span className="font-semibold text-primary-text">Material:</span> 100% Organic Combed Cotton</div>
                      <div><span className="font-semibold text-primary-text">Fit:</span> Relaxed Tailored</div>
                      <div><span className="font-semibold text-primary-text">Origin:</span> Portugal</div>
                      <div><span className="font-semibold text-primary-text">Care:</span> Machine wash cold, dry flat</div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="py-3.5 sm:py-4">
              <button
                type="button"
                onClick={() => toggleAccordion("shipping")}
                className="flex w-full items-center justify-between gap-3 text-left text-[11px] font-bold uppercase tracking-wider text-primary-text transition-colors hover:text-brand sm:text-xs"
              >
                <span className="min-w-0 pr-2">Shipping &amp; Returns</span>
                <span className="shrink-0 text-brand">{openSections.shipping ? "−" : "+"}</span>
              </button>
              {openSections.shipping && (
                <p className="mt-3 text-xs leading-relaxed text-subtext">
                  Standard delivery takes 2–4 business days. Express next-day courier delivery available at checkout.
                  Complimentary returns within 30 days of receipt in original unworn condition with tags attached.
                </p>
              )}
            </div>
          </div>

          {/* WhatsApp contact — below Shipping & Returns */}
          <a
            href={SCOSHA_CONTACT.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Contact us on WhatsApp ${SCOSHA_CONTACT.whatsappDisplay}`}
            className="mt-5 flex items-center gap-3 rounded-2xl border border-border-subtle bg-white px-3.5 py-3.5 transition hover:border-brand sm:mt-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1A1A1A]/22 bg-white text-primary-text">
              <WhatsAppIcon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-black tracking-tight text-primary-text">Contact Us</span>
              <span className="mt-0.5 block text-xs leading-snug text-subtext">
                For more information contact us on WhatsApp
              </span>
            </span>
          </a>
        </div>
      </div>

      {/* Sticky mobile buy bar — sits above bottom nav */}
      <div
        className="fixed inset-x-0 z-30 border-t border-border-subtle bg-surface/95 px-3 py-2.5 backdrop-blur-md sm:hidden"
        style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            onClick={() => void wishlist.toggle(product.id)}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all",
              isWished
                ? "border-brand bg-brand/10 text-brand"
                : "border-border-subtle bg-white text-subtext"
            )}
            aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={cn("h-5 w-5", isWished ? "fill-brand text-brand" : "")} />
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => void handleAddToCart()}
            className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#7A1F2B" }}
          >
            {canAdd
              ? `Add to Bag • $${(product.price * quantity).toFixed(2)}`
              : "Out of stock"}
          </button>
        </div>
      </div>

      {/* Sizing Guide Interactive Modal */}
      {sizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-primary-text/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl border border-border-subtle bg-white p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-primary-text shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:p-8 sm:pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3 sm:items-center sm:pb-4">
              <div className="min-w-0">
                <h3 className="text-base font-black uppercase tracking-wider text-primary-text sm:text-lg">
                  {sizeChart.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted sm:text-xs">{sizeChart.hint}</p>
              </div>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="shrink-0 rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-primary-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 -mx-1 overflow-x-auto overscroll-x-contain sm:mt-5 sm:mx-0">
              <table className="w-full min-w-[480px] border-collapse text-left text-[11px] sm:min-w-0 sm:text-xs">
                <thead>
                  <tr className="border-b-2 border-brand bg-brand-light">
                    {sizeChart.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap p-2.5 font-bold uppercase tracking-wider text-brand sm:p-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {sizeChart.rows.map((row) => (
                    <tr key={row.label} className="hover:bg-surface">
                      <td className="whitespace-nowrap p-2.5 font-bold text-primary-text sm:p-3">{row.label}</td>
                      <td className="whitespace-nowrap p-2.5 text-subtext sm:p-3">{row.us}</td>
                      <td className="whitespace-nowrap p-2.5 text-subtext sm:p-3">{row.uk}</td>
                      <td className="whitespace-nowrap p-2.5 text-subtext sm:p-3">{row.eu}</td>
                      {Object.entries(row.cols).map(([colName, val]) => (
                        <td key={colName} className="whitespace-nowrap p-2.5 text-primary-text sm:p-3">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-2xl border border-border-subtle bg-surface p-3.5 text-xs sm:mt-6 sm:p-4">
              <p className="mb-2 font-black uppercase tracking-wider text-primary-text">
                How to Measure:
              </p>
              <ul className="list-disc space-y-1 pl-4 text-subtext">
                {SIZE_MEASURE_TIPS.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] italic text-muted">
                {SIZE_GUIDE_TIP}
              </p>
            </div>

            <div className="mt-5 flex justify-stretch sm:mt-6 sm:justify-end">
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="w-full rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110 sm:w-auto sm:py-2.5"
                style={{ background: "#7A1F2B" }}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Related Products */}
      {(related.length > 0 || relatedQuery.isLoading) && (
        <section className="mt-10 border-t border-border-subtle pt-8 sm:mt-16 sm:pt-12">
          <div className="mb-5 text-center sm:mb-8">
            <h2 className="text-lg font-black uppercase tracking-tight text-primary-text sm:text-2xl">
              Complete the Look
            </h2>
            <p className="mt-1 text-xs text-muted">Recommended pieces that layer together effortlessly.</p>
          </div>
          {relatedQuery.isLoading && related.length === 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
