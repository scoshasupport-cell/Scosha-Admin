"use client"

import { motion } from "framer-motion"
import { Ruler, ShieldCheck, UserCheck } from "lucide-react"
import { useSkinScan } from "@/lib/store"

const STEPS = [
  { icon: UserCheck, title: "Frame Body Silhouette", text: "Align your full body outline in natural lighting for accurate detection." },
  { icon: Ruler, title: "3D Dimension Extraction", text: "Measures shoulder width, chest, waist, hips, and inseam geometry in real-time." },
  { icon: ShieldCheck, title: "Precision Size Match", text: "Instant recommendation mapped to Zara, H&M, and EU benchmark size charts." },
]

export function ScanCta() {
  const openScan = useSkinScan((s) => s.open)

  return (
    <section className="store-container py-10 sm:py-14 md:py-20">
      <div
        className="relative overflow-hidden rounded-2xl px-5 py-10 text-white shadow-2xl shadow-brand/25 sm:rounded-3xl sm:px-8 sm:py-14 md:px-16"
        style={{ background: "#7A1F2B" }}
      >
        {/* Background blobs */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #9A4A55 0%, transparent 70%)" }}
        />

        <div className="relative grid items-center gap-12 md:grid-cols-2">
          {/* Left Content */}
          <div className="flex flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Ruler className="h-3.5 w-3.5 text-highlight" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">AI Body &amp; Sizing Scan</span>
            </div>

            <h2 className="text-balance text-3xl font-black uppercase tracking-tight sm:text-4xl leading-[1.05]">
              Your Perfect Size Match,{" "}
              <span className="text-highlight">in Seconds.</span>
            </h2>

            <p className="max-w-md text-sm leading-relaxed text-white/75">
              Our on-device computer vision scanner measures your body proportions and maps you to the exact size for every top, trouser, dress, and outerwear piece in our catalog.
            </p>

            <button
              type="button"
              onClick={openScan}
              className="w-fit rounded-xl border border-white/20 bg-white/15 px-7 py-3.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-all hover:bg-white hover:text-brand hover:border-transparent hover:shadow-lg"
            >
              Start Body Fit Scan
            </button>
          </div>

          {/* Right Steps */}
          <div className="grid gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.12 }}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm transition-all hover:bg-white/15"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-highlight">Step {i + 1}</p>
                  <p className="mt-0.5 font-bold text-sm text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
