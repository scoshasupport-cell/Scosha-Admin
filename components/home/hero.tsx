"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { heroSlides, HERO_ASPECT } from "@/lib/hero-data"

const AUTOPLAY_MS = 4000

export function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const total = heroSlides.length

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % total) + total) % total)
    },
    [total],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || paused) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % total)
    }, AUTOPLAY_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, total, ready])

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
        setPaused(true)
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
        touchStartX.current = null
        window.setTimeout(() => setPaused(false), 2500)
        if (Math.abs(dx) < 40) return
        if (dx < 0) next()
        else prev()
      }}
      className="relative w-full overflow-hidden bg-surface"
    >
      {/* Taller on phones so copy/CTA stay usable; desktop keeps art ratio */}
      <div
        className="relative w-full min-h-[min(72vw,22rem)] sm:min-h-0"
        style={{ aspectRatio: HERO_ASPECT }}
      >
        {heroSlides.map((s, i) => {
          const active = i === index
          return (
            <div
              key={s.id}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-700 ${
                active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Image
                src={s.imageSrc}
                alt={s.alt}
                fill
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : "low"}
                sizes="100vw"
                className="object-cover object-center"
              />

              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[72%] sm:w-[52%] md:w-[46%] lg:w-[40%]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(247,243,238,0.94) 0%, rgba(247,243,238,0.62) 58%, rgba(247,243,238,0) 100%)",
                }}
              />

              <div className="absolute inset-0 z-20 flex items-center">
                <div className="w-full max-w-[88%] pl-4 pr-3 sm:max-w-[min(52%,26rem)] sm:pl-[5%] sm:pr-0 md:max-w-[min(46%,28rem)] md:pl-[6%] lg:max-w-[min(40%,30rem)] lg:pl-[7%] xl:pl-[8%]">
                  <h2 className="font-serif text-[clamp(1.65rem,7vw,5.25rem)] font-semibold leading-[0.95] tracking-[0.04em] text-[#7A1F2B]">
                    {s.title}
                  </h2>

                  <div className="mt-2 h-px w-8 bg-[#7A1F2B] sm:mt-3 sm:w-10 md:mt-4 md:w-12" />

                  <p className="mt-2 font-serif text-[clamp(0.95rem,3.4vw,1.65rem)] font-normal leading-snug tracking-[0.02em] text-[#7A1F2B] sm:mt-3 md:mt-4">
                    {s.subtitle}
                  </p>

                  <Link
                    href={s.ctaHref}
                    prefetch={false}
                    tabIndex={active ? 0 : -1}
                    className="mt-4 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-[#7A1F2B] px-4 py-2.5 text-[11px] font-medium tracking-[0.02em] text-white transition hover:bg-[#5C1520] sm:mt-6 sm:px-5 sm:text-[12px] md:mt-7 md:px-6 md:py-3 md:text-[13px]"
                  >
                    <span>{s.ctaLabel}</span>
                    <span aria-hidden className="text-[14px] leading-none">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 sm:bottom-4 md:bottom-5 sm:gap-2">
          {heroSlides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9"
            >
              <span
                className={`rounded-full transition-all ${
                  i === index
                    ? "h-1.5 w-6 bg-[#7A1F2B] sm:w-7"
                    : "h-1.5 w-1.5 bg-black/30 hover:bg-black/45"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
