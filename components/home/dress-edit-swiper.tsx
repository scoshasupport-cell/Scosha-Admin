"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { channelShopHref } from "@/lib/product-types"

const DRESSES_HREF = `${channelShopHref("women")}&productType=dresses`

const SLIDES = [
  {
    piece: {
      src: "/home/dress-edit/the-piece.jpg",
      alt: "Red ruched halter dress flat lay with accessories",
      label: "The Piece",
    },
    look: {
      src: "/home/dress-edit/the-look.jpg",
      alt: "Model wearing the red backless dress",
      label: "The Look",
    },
  },
] as const

export function DressEditSwiper() {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [pos, setPos] = useState(52)
  const [slide, setSlide] = useState(0)
  const current = SLIDES[slide] ?? SLIDES[0]

  function setFromClientX(clientX: number) {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const next = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(88, Math.max(12, next)))
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging.current) return
      setFromClientX(e.clientX)
    }
    function onUp() {
      dragging.current = false
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [])

  return (
    <section className="border-y border-border-subtle/70 bg-[#FBF7F2]">
      <div className="store-container py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-[1.85rem] font-medium leading-[1.15] tracking-tight text-primary-text sm:text-4xl md:text-[2.75rem]">
            Own Every Entrance.
          </h2>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtext sm:text-xs">
            One dress. Infinite nights.
          </p>
        </div>

        <div
          ref={trackRef}
          className="relative mx-auto mt-8 aspect-[4/5] w-full max-w-4xl touch-none overflow-hidden rounded-sm bg-[#ece7e1] select-none sm:mt-10 sm:aspect-[16/11] md:mt-12"
          onPointerDown={(e) => {
            dragging.current = true
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            setFromClientX(e.clientX)
          }}
        >
          {/* THE LOOK (full base) */}
          <Image
            src={current.look.src}
            alt={current.look.alt}
            fill
            loading="lazy"
            sizes="(max-width: 896px) 100vw, 896px"
            className="pointer-events-none object-cover object-[center_18%]"
            draggable={false}
          />

          {/* THE PIECE (revealed from the left) */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <Image
              src={current.piece.src}
              alt={current.piece.alt}
              fill
              loading="lazy"
              sizes="(max-width: 896px) 100vw, 896px"
              className="pointer-events-none object-cover object-center"
              draggable={false}
            />
          </div>

          {/* Divider + handle */}
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/95"
            style={{ left: `${pos}%` }}
          >
            <div className="pointer-events-auto absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-primary-text shadow-md">
              <ChevronLeft size={14} strokeWidth={2.2} className="-mr-0.5" />
              <ChevronRight size={14} strokeWidth={2.2} className="-ml-0.5" />
            </div>
          </div>

          <span className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-text shadow-sm sm:bottom-5 sm:px-4 sm:text-[11px]">
            {current.piece.label}
          </span>
          <span className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-text shadow-sm sm:bottom-5 sm:right-5 sm:px-4 sm:text-[11px]">
            {current.look.label}
          </span>
        </div>

        {SLIDES.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show dress edit ${i + 1}`}
                onClick={() => {
                  setSlide(i)
                  setPos(52)
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? "w-6 bg-brand" : "w-1.5 bg-black/20"
                }`}
              />
            ))}
          </div>
        )}

        <div className="mx-auto mt-9 max-w-xl text-center sm:mt-11">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-subtext sm:text-[11px]">
            The Scosha Edit
          </p>
          <h3 className="mt-2 font-serif text-2xl font-medium tracking-tight text-primary-text sm:text-3xl">
            From piece to presence.
          </h3>
          <Link
            href={DRESSES_HREF}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
            style={{ background: "#7A1F2B" }}
          >
            Shop dresses
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
