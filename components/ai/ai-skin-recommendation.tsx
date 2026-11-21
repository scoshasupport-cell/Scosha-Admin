"use client"

import Image from "next/image"
import { Sparkles, ArrowRight } from "lucide-react"
import { useSkinScan } from "@/lib/store"

export function AISkinRecommendation() {
  const openScan = useSkinScan((state) => state.open)

  return (
    <div className="my-6 rounded-2xl border border-brand/25 bg-linear-to-br from-[#fdf4fa] to-white p-5 shadow-xs transition hover:border-brand/40">
      <div className="flex items-start gap-4">
        {/* Face + Sonar Graphic */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-light p-1.5 border border-brand/20 shadow-xs">
          <Image
            src="/assets/ai/ai-face-sonar.svg"
            alt="AI Skin Analysis"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>

        {/* Text and Info */}
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-brand">
            <Sparkles size={13} className="text-brand animate-spin-slow" />
            <span>AI Skin Advisor</span>
          </div>

          <h3 className="mt-1 text-[16px] font-bold leading-snug text-black">
            Not sure this is right for your skin?
          </h3>

          <p className="mt-1 text-[13px] leading-relaxed text-[#555555]">
            Get an AI skin analysis in under 30 seconds and see exactly which product fits your concerns.
          </p>

          <button
            type="button"
            onClick={openScan}
            className="mt-3.5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-dark hover:shadow active:scale-98"
          >
            <span>Scan my skin</span>
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  )
}
