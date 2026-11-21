"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, X } from "lucide-react"
import { useQuickView } from "@/lib/store"
import { useBagCart } from "@/hooks/useBagCart"
import { useShopWishlist } from "@/hooks/useShopWishlist"
import { Price } from "@/components/price"
import { cn, isPlaceholderColorName, visibleProductColors } from "@/lib/utils"

export function QuickView() {
  const { product, close } = useQuickView()
  const { addProduct } = useBagCart()
  const wishlist = useShopWishlist()
  const displayColors = useMemo(
    () => (product ? visibleProductColors(product.colors) : []),
    [product],
  )
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")

  useEffect(() => {
    if (!product) {
      setColor("")
      setSize("")
      return
    }
    setColor(displayColors[0]?.name || "")
    const sizes = product.sizes?.length ? product.sizes : ["M"]
    const inStockSize = sizes.find((s) =>
      product.variants?.some(
        (v) => v.size === s && Boolean(v.inStock) && (v.stock ?? 0) > 0,
      ),
    )
    setSize(inStockSize || sizes[0] || "M")
  }, [product, displayColors])

  useEffect(() => {
    if (!product) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [product, close])

  const activeColor = displayColors.find((c) => c.name === color) ?? displayColors[0]
  const image =
    activeColor?.image ||
    activeColor?.images?.[0] ||
    product?.images?.[0] ||
    "/placeholder.svg"
  const wished = product ? wishlist.isWished(product.id) : false
  const sizes = product?.sizes?.length ? product.sizes : ["OS"]
  const cartColor = color && !isPlaceholderColorName(color) ? color : undefined

  return (
    <AnimatePresence>
      {product ? (
        <div
          role="dialog"
          aria-modal
          aria-label={`${product.title} quick view`}
          className="fixed inset-0 z-[120] grid place-items-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/45"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="relative grid max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white md:grid-cols-2"
          >
            <button
              type="button"
              aria-label="Close quick view"
              onClick={close}
              className="absolute right-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-primary-text shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative aspect-square max-h-[40vh] bg-surface-2 md:max-h-none md:aspect-auto md:min-h-[420px]">
              <Image
                key={image}
                src={image}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col p-5 sm:p-6 md:p-8">
              <div className="flex items-center justify-between gap-3 pr-10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Scosha</p>
                {product.rating != null ? (
                  <span className="text-[12px] text-muted">
                    {product.rating.toFixed(1)}
                    {product.reviewCount ? ` · ${product.reviewCount}` : ""}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 break-words text-[1.05rem] font-bold leading-snug tracking-tight text-primary-text sm:text-lg">
                {product.title}
              </h2>

              <div className="mt-3 flex items-baseline gap-2">
                <Price amount={product.price} className="text-lg font-bold text-primary-text" />
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <Price
                    amount={product.compareAtPrice}
                    className="text-sm text-muted line-through"
                  />
                ) : null}
              </div>

              {product.description ? (
                <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-muted">
                  {product.description}
                </p>
              ) : null}

              {displayColors.length > 1 ? (
                <>
                  <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">
                    Colour — {color}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {displayColors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        onClick={() => setColor(c.name)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 border-white transition",
                          color === c.name ? "ring-2 ring-brand ring-offset-1" : "opacity-80",
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const variant = product.variants?.find(
                    (v) =>
                      v.size === s &&
                      (!cartColor || !v.colorName || v.colorName === cartColor),
                  )
                  const oos = variant
                    ? !(variant.inStock && (variant.stock ?? 0) > 0)
                    : false
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={oos}
                      aria-pressed={size === s}
                      onClick={() => setSize(s)}
                      className={cn(
                        "min-w-11 rounded-md border px-3 py-2 text-[13px] font-medium transition",
                        oos && "cursor-not-allowed opacity-35 line-through",
                        size === s
                          ? "border-primary-text bg-primary-text text-white"
                          : "border-border-subtle bg-white text-primary-text hover:border-brand",
                      )}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void addProduct(product, {
                      size,
                      color: cartColor,
                      quantity: 1,
                    }).then(() => close())
                  }}
                  className="flex-1 rounded-md bg-brand py-3.5 text-[12px] font-bold uppercase tracking-wider text-white transition hover:opacity-90"
                >
                  Add to bag
                </button>
                <button
                  type="button"
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={wished}
                  onClick={() => void wishlist.toggle(product.id)}
                  className="grid w-12 place-items-center rounded-md border border-border-subtle hover:bg-surface-2"
                >
                  <Heart
                    className={cn("h-4 w-4", wished && "fill-brand text-brand")}
                    strokeWidth={1.75}
                  />
                </button>
              </div>

              <Link
                href={`/product/${product.handle}`}
                onClick={close}
                className="mt-4 self-start text-[13px] font-medium text-primary-text underline-offset-4 hover:underline"
              >
                View full details
              </Link>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
