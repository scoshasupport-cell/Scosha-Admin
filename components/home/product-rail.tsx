"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { ProductCard } from "@/components/product/product-card"
import type { Product } from "@/types/ecommerce"

export interface ProductRailData {
  id: string
  title: string
  viewAllHref: string
  products: Product[]
  tabs?: string[]
}

const AUTO_MS = 3200

export function ProductRail({ rail }: { rail: ProductRailData }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [paused, setPaused] = useState(false)

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.55, 200)
    const max = el.scrollWidth - el.clientWidth
    if (max <= 4) return

    if (dir > 0 && el.scrollLeft >= max - 8) {
      el.scrollTo({ left: 0, behavior: "smooth" })
      return
    }
    if (dir < 0 && el.scrollLeft <= 8) {
      el.scrollTo({ left: max, behavior: "smooth" })
      return
    }
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (paused || rail.products.length < 3) return
    const id = window.setInterval(() => scrollBy(1), AUTO_MS)
    return () => window.clearInterval(id)
  }, [paused, rail.products.length, scrollBy])

  const title = rail.title.replaceAll("✨", "").trim()

  return (
    <section className="store-container border-b border-surface-2 py-8 last:border-b-0 sm:py-14">
      <div className="mb-6 flex flex-col items-center text-center sm:mb-10">
        <h2 className="px-2 font-serif text-[1.25rem] font-black tracking-tight text-primary-text sm:text-[28px] md:text-[34px]">
          {title}
        </h2>

        <div className="mt-3 flex w-full items-center justify-between gap-3 sm:mt-4 sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border-subtle bg-white text-subtext shadow-sm transition-all hover:border-brand hover:bg-brand-light hover:text-brand sm:h-10 sm:w-10"
          >
            <ChevronLeft size={18} />
          </button>

          <Link
            href={rail.viewAllHref}
            className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand transition hover:text-brand-dark"
          >
            <span>View all</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>

          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border-subtle bg-white text-subtext shadow-sm transition-all hover:border-brand hover:bg-brand-light hover:text-brand sm:h-10 sm:w-10"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-3 h-0.5 w-12 rounded-full" style={{ background: "#7A1F2B" }} />

        {rail.tabs && rail.tabs.length > 0 && (
          <div className="mt-4 flex max-w-full justify-center gap-1 overflow-x-auto px-1 flex-wrap">
            {rail.tabs.map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all sm:px-4 sm:py-1.5 ${
                  activeTab === i
                    ? "text-white shadow"
                    : "bg-surface-2 text-subtext hover:bg-brand-light hover:text-brand"
                }`}
                style={activeTab === i ? { background: "#7A1F2B" } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-2 sm:gap-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPaused(false)
          }
        }}
      >
        {rail.products.map((product, index) => (
          <div
            key={`${rail.id}-${product.id}-${index}`}
            className="w-[min(44vw,11rem)] shrink-0 snap-start sm:w-48 md:w-52 lg:w-56"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
