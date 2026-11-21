"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, Heart, ShoppingBag } from "lucide-react"
import { useShopWishlist } from "@/hooks/useShopWishlist"
import { useBagCart } from "@/hooks/useBagCart"
import { useQuickView } from "@/lib/store"
import type { Product } from "@/types/ecommerce"
import { Price } from "@/components/price"
import { cn, isPlaceholderColorName, visibleProductColors } from "@/lib/utils"

const AUTO_MS = 1600
const MANUAL_PAUSE_MS = 3000

function cardGallery(product: Product, colorName: string): string[] {
  const active = product.colors?.find((c) => c.name === colorName) ?? product.colors?.[0]
  const raw = [
    active?.image,
    active?.image2,
    ...(active?.images || []),
    ...(product.images || []),
  ].filter((u): u is string => Boolean(u && String(u).trim()))
  return [...new Set(raw)]
}

export function ProductCard({
  product,
  className,
  compareEnabled,
  compared,
  onCompareToggle,
}: {
  product: Product
  className?: string
  compareEnabled?: boolean
  compared?: boolean
  onCompareToggle?: (product: Product) => void
}) {
  const displayColors = visibleProductColors(product.colors)
  const [activeColor, setActiveColor] = useState(displayColors[0]?.name || "")
  const slides = useMemo(() => {
    const g = cardGallery(product, activeColor)
    return g.length ? g : ["/placeholder.svg"]
  }, [product, activeColor])
  const slideCount = slides.length
  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(index, slideCount - 1)

  const mediaRef = useRef<HTMLDivElement>(null)
  const slideCountRef = useRef(slideCount)
  const pauseUntilRef = useRef(0)
  const dragRef = useRef<{
    active: boolean
    startX: number
    lastX: number
    moved: boolean
    pointerId: number
  } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    slideCountRef.current = slideCount
  }, [slideCount])

  const wishlist = useShopWishlist()
  const { addProduct } = useBagCart()
  const { open: openQuickView } = useQuickView()
  const isWished = wishlist.isWished(product.id)
  const [adding, setAdding] = useState(false)
  const selectedSize = product.sizes?.[0] || "M"
  const cartColor =
    activeColor && !isPlaceholderColorName(activeColor) ? activeColor : undefined

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0
  const saveAmount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0

  useEffect(() => {
    setIndex(0)
  }, [activeColor, product.id])

  useEffect(() => {
    const el = mediaRef.current
    if (!el || typeof IntersectionObserver === "undefined") return

    let timer: number | null = null

    const stop = () => {
      if (timer != null) {
        window.clearInterval(timer)
        timer = null
      }
    }

    const tick = () => {
      if (Date.now() < pauseUntilRef.current) return
      if (dragRef.current?.active) return
      const n = slideCountRef.current
      if (n <= 1) return
      setIndex((i) => (i + 1) % n)
    }

    const start = () => {
      stop()
      if (slideCountRef.current <= 1) return
      timer = window.setInterval(tick, AUTO_MS)
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) start()
        else stop()
      },
      { threshold: [0, 0.05, 0.2, 0.5], rootMargin: "100px 0px 100px 0px" },
    )

    io.observe(el)
    return () => {
      stop()
      io.disconnect()
    }
  }, [product.id, activeColor, slideCount])

  function pauseAuto() {
    pauseUntilRef.current = Date.now() + MANUAL_PAUSE_MS
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (slideCount <= 1) return
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return
    if ((e.target as HTMLElement).closest("button")) return
    dragRef.current = {
      active: true,
      startX: e.clientX,
      lastX: e.clientX,
      moved: false,
      pointerId: e.pointerId,
    }
    pauseAuto()
    // Defer capture until a real swipe — early capture can swallow the tap/click on mobile
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag?.active || drag.pointerId !== e.pointerId) return
    drag.lastX = e.clientX
    if (Math.abs(e.clientX - drag.startX) > 8) {
      if (!drag.moved) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      drag.moved = true
    }
  }

  function endPointer(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag?.active || drag.pointerId !== e.pointerId) return
    const dx = drag.lastX - drag.startX
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    // Only block navigation after a real swipe — small finger jitter must still open PDP
    if (Math.abs(dx) > 40) {
      suppressClickRef.current = true
      pauseAuto()
      const n = slideCountRef.current
      setIndex((i) => ((i + (dx < 0 ? 1 : -1)) % n + n) % n)
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 300)
    }
  }

  function handleColorClick(e: React.MouseEvent, colorObj: { name: string; image: string }) {
    e.preventDefault()
    e.stopPropagation()
    setActiveColor(colorObj.name)
  }

  return (
    <article className={cn("group relative flex min-w-0 flex-col bg-transparent text-left", className)}>
      {/* Image Container */}
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl bg-surface-2 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-brand/10">
        {/* Discount Badge */}
        {saveAmount > 0 ? (
          <span
            className="absolute left-2.5 top-2.5 z-10 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow"
            style={{ background: "#7A1F2B" }}
          >
            -{discount}%
          </span>
        ) : product.badge ? (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-lg bg-primary-text px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow">
            {product.badge}
          </span>
        ) : null}

        {/* Compare Checkbox */}
        {compareEnabled ? (
          <label className="absolute bottom-2.5 left-2.5 z-10 flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-semibold text-primary-text shadow-sm select-none">
            <input
              type="checkbox"
              checked={Boolean(compared)}
              onChange={() => onCompareToggle?.(product)}
              className="accent-brand"
            />
            <span>Compare</span>
          </label>
        ) : null}

        {/* Auto-sliding gallery (no dots) */}
        <div
          ref={mediaRef}
          className="absolute inset-0 touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <Link
            href={`/product/${product.handle}`}
            className="absolute inset-0 block overflow-hidden"
            draggable={false}
            onClick={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            <div
              className="flex h-full w-full will-change-transform"
              style={{
                transform: `translate3d(-${safeIndex * 100}%, 0, 0)`,
                transition: "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {slides.map((src, i) => (
                <div key={`${src}-${i}`} className="relative h-full w-full min-w-full shrink-0">
                  <Image
                    src={src}
                    alt={i === 0 ? product.title : ""}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="pointer-events-none object-cover"
                    draggable={false}
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </Link>
        </div>

        {/* Wishlist + Quick view + Add to bag — top-right stacked circles */}
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void wishlist.toggle(product.id)
            }}
            aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWished}
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/95 text-primary-text shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-8 sm:w-8"
          >
            <Heart
              size={14}
              strokeWidth={1.75}
              className={cn(isWished && "fill-brand text-brand")}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openQuickView(product)
            }}
            aria-label="Quick view"
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/95 text-primary-text shadow-sm backdrop-blur-sm transition hover:bg-white sm:h-8 sm:w-8"
          >
            <Eye size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={adding || product.inStock === false}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setAdding(true)
              void addProduct(product, {
                size: selectedSize,
                color: cartColor,
                quantity: 1,
              }).finally(() => setAdding(false))
            }}
            aria-label="Add to bag"
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/95 text-primary-text shadow-sm backdrop-blur-sm transition hover:bg-white disabled:opacity-40 sm:h-8 sm:w-8"
          >
            <ShoppingBag size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Color Swatches — skip placeholder-only Default */}
      {displayColors.length > 1 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {displayColors.slice(0, 5).map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={(e) => handleColorClick(e, c)}
              title={c.name}
              className={cn(
                "h-6 w-6 rounded-full border-2 border-white transition-all hover:scale-110",
                activeColor === c.name ? "ring-2 ring-brand ring-offset-1" : "opacity-80"
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          {displayColors.length > 5 && (
            <span className="text-[10px] text-muted">+{displayColors.length - 5}</span>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="flex flex-1 flex-col">
        <h3 className="line-clamp-1 text-[13.5px] font-semibold text-primary-text transition group-hover:text-brand">
          <Link href={`/product/${product.handle}`}>{product.title}</Link>
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <Price amount={product.price} className="text-[14px] font-bold text-primary-text" />
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <Price amount={product.compareAtPrice} className="text-[12px] text-muted line-through" />
          )}
        </div>
      </div>
    </article>
  )
}
