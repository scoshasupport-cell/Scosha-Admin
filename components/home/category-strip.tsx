"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CATEGORY_ROUTES } from "@/lib/category-routes"
import { useSkinScan } from "@/lib/store"

const CATEGORIES: {
  label: string
  image: string
  href?: string
  action?: "ai"
}[] = [
  {
    label: "AI Scan",
    image: "/Aiscanclothes.jpeg",
    action: "ai",
  },
  {
    label: CATEGORY_ROUTES.women.label,
    href: CATEGORY_ROUTES.women.href,
    image: "/main-category-slider/women.jpeg",
  },
  {
    label: CATEGORY_ROUTES.men.label,
    href: CATEGORY_ROUTES.men.href,
    image: "/main-category-slider/man.jpeg",
  },
  {
    label: CATEGORY_ROUTES.kids.label,
    href: CATEGORY_ROUTES.kids.href,
    image: "/main-category-slider/kids.jpeg",
  },
  {
    label: CATEGORY_ROUTES.shoes.label,
    href: CATEGORY_ROUTES.shoes.href,
    image: "/main-category-slider/shoes.jpeg",
  },
  {
    label: CATEGORY_ROUTES.beauty.label,
    href: CATEGORY_ROUTES.beauty.href,
    image: "/main-category-slider/beauty.jpeg",
  },
  {
    label: CATEGORY_ROUTES.bags.label,
    href: CATEGORY_ROUTES.bags.href,
    image: "/main-category-slider/bags.jpeg",
  },
  {
    label: CATEGORY_ROUTES.home.label,
    href: CATEGORY_ROUTES.home.href,
    image: "/main-category-slider/home.jpeg",
  },
  {
    label: CATEGORY_ROUTES.tech.label,
    href: CATEGORY_ROUTES.tech.href,
    image: "/main-category-slider/Tech.jpeg",
  },
] 

const AUTOPLAY_MS = 2800

const cardClass =
  "group flex w-[44%] shrink-0 snap-start touch-manipulation flex-col items-center text-center sm:w-[30%] md:w-[23%] lg:w-[16%] xl:w-[14%]"

export function CategoryStrip() {
  const router = useRouter()
  const trackRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const openScan = useSkinScan((state) => state.open)

  useEffect(() => {
    setReady(true)
  }, [])

  const scrollToIndex = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    const el = trackRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>("[data-cat-card]")
    const card = cards[i]
    if (!card) return
    el.scrollTo({ left: card.offsetLeft, behavior })
  }, [])

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = (indexRef.current + dir + CATEGORIES.length) % CATEGORIES.length
      indexRef.current = next
      scrollToIndex(next)
    },
    [scrollToIndex],
  )

  useEffect(() => {
    if (!ready || paused) return
    const id = window.setInterval(() => {
      const next = (indexRef.current + 1) % CATEGORIES.length
      indexRef.current = next
      scrollToIndex(next, next === 0 ? "auto" : "smooth")
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [ready, paused, scrollToIndex])

  return (
    <section className="bg-surface">
      <div className="store-container relative py-10 sm:py-12 lg:py-14">
        <div
          ref={trackRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => {
            window.setTimeout(() => setPaused(false), 2800)
          }}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth sm:gap-4 lg:gap-5"
        >
          {CATEGORIES.map((cat) => {
            const media = (
              <>
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-2">
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 26vw, 18vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    priority={cat.label === "Women"}
                  />
                </div>
                <span className="mt-3.5 font-serif text-[12px] font-medium uppercase tracking-[0.14em] text-primary-text sm:mt-4 sm:text-[13px]">
                  {cat.label}
                </span>
                <span className="mt-2 h-[2px] w-8 bg-brand transition-all duration-300 group-hover:w-12" />
              </>
            )
            if (cat.action === "ai") {
              return (
                <button
                  key={cat.label}
                  type="button"
                  data-cat-card
                  onClick={openScan}
                  className={cardClass}
                >
                  {media}
                </button>
              )
            }
            const href = cat.href || "/shop"
            return (
              <button
                key={cat.label}
                type="button"
                data-cat-card
                onClick={() => router.push(href)}
                className={cardClass}
              >
                {media}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous categories"
          className="absolute left-1 top-[42%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white/90 text-primary-text shadow-sm transition hover:bg-white sm:left-0 sm:flex lg:-left-2"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next categories"
          className="absolute right-1 top-[42%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white/90 text-primary-text shadow-sm transition hover:bg-white sm:right-0 sm:flex lg:-right-2"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}
