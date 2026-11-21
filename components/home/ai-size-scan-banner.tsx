"use client"

import Link from "next/link"
import { Ruler } from "lucide-react"
import { useSkinScan } from "@/lib/store"

export function AiSizeScanBanner() {
  const openScan = useSkinScan((s) => s.open)

  return (
    <section className="store-container pb-10 sm:pb-14">
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-10 text-white sm:px-10 sm:py-12"
        style={{ background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 45%, #C4B5FD 100%)" }}
      >
        <div className="relative z-10 grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="text-primary-text">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-sale)]">
              AI Body &amp; Size Scan
            </p>
            <h2 className="mt-3 font-serif text-3xl font-black tracking-tight text-primary-text sm:text-4xl">
              Not sure what size to choose?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-subtext">
              Scan your body and let SCOSHA recommend your perfect fit when you try on an outfit.
            </p>
            <button
              type="button"
              onClick={openScan}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ background: "#7A1F2B" }}
            >
              <Ruler size={14} />
              Find My Size
            </button>
          </div>

          <div className="flex justify-center md:justify-end">
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-[var(--color-sale)]/40 bg-white/60 text-[var(--color-sale)] sm:h-44 sm:w-44"
            >
              <div className="text-center">
                <Ruler size={36} className="mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Find My Size</p>
              </div>
            </div>
          </div>
        </div>
        <Link href="/ai-scan" className="sr-only">
          Open AI size scan
        </Link>
      </div>
    </section>
  )
}
