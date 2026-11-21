"use client"

import Image from "next/image"
import { Ruler, Camera, ShieldCheck, Zap, UserCheck, Sparkles } from "lucide-react"
import { useSkinScan } from "@/lib/store"

export default function AiScanPage() {
  const openModal = useSkinScan((s) => s.open)

  return (
    <main className="store-container py-10 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl border border-border-subtle bg-[#f5f5f5] p-3 shadow-md">
          <Image
            src="/assets/ai/ai-body-sketch.svg"
            alt="AI Shopping Assistant"
            width={100}
            height={100}
            className="object-contain"
            priority
          />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-[#f5f5f5] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-black">
          <Sparkles size={12} />
          <span>AI Shopping Assistant</span>
        </span>

        <h1 className="mt-3 text-[32px] font-extrabold uppercase leading-tight tracking-tight text-black sm:text-[40px]">
          Scan. Match. Shop what fits.
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-[#555555]">
          Face, body, furniture, or any photo — Scosha first understands what is in your image, then
          recommends up to five in-stock products that genuinely match it, with size checks and
          optional virtual try-on where supported.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
          <button
            type="button"
            onClick={openModal}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-8 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#262626] sm:w-auto"
          >
            <Camera size={18} strokeWidth={2} />
            <span>Open AI Assistant</span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-subtext">
          <ShieldCheck size={15} className="text-black" />
          <span>Photos are used for recommendations only — not saved to your account.</span>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:mt-24 sm:grid-cols-3">
        {[
          {
            step: "01",
            icon: Camera,
            title: "Capture or upload",
            desc: "Face, full body, furniture, or a smart upload that auto-routes your photo.",
          },
          {
            step: "02",
            icon: Zap,
            title: "AI + live catalog",
            desc: "We analyze the image and match real Scosha inventory — never fake products.",
          },
          {
            step: "03",
            icon: UserCheck,
            title: "Only relevant picks",
            desc: "Up to five matches by type, color, style, gender and your size — and an honest answer when nothing fits.",
          },
        ].map((s) => (
          <div
            key={s.step}
            className="flex flex-col items-center rounded-2xl border border-border-subtle bg-white p-6 text-center shadow-xs transition hover:border-black"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-[#f5f5f5] text-black">
              <s.icon size={22} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-black">
              Step {s.step}
            </span>
            <h3 className="mt-1 text-[16px] font-bold text-black">{s.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-subtext">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-3xl border border-[#262626] bg-[#111111] p-8 text-center text-white shadow-xl sm:p-12">
        <h2 className="text-[24px] font-extrabold uppercase tracking-tight sm:text-[30px]">
          Ready to find your matches?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-[14px] text-[#a3a3a3]">
          Includes size guidance for clothing and color coordination for home décor.
        </p>
        <button
          type="button"
          onClick={openModal}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-8 text-xs font-bold uppercase tracking-wider text-black shadow-lg transition hover:bg-border-subtle"
        >
          <Ruler size={16} />
          <span>Start free scan</span>
        </button>
      </div>
    </main>
  )
}
