"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { X, Camera, Upload, RotateCcw, Check, Sparkles, ShieldCheck, ArrowRight, ShoppingBag } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useSkinScan, useCart } from "@/lib/store"
import { aiService, type AISkinAnalysisResult } from "@/lib/ai-service"
import { Price } from "@/components/price"

type ScanStep = "intro" | "upload" | "scanning" | "results"

const SCAN_STEPS_TEXT = [
  "Mapping facial zones & landmarks...",
  "Evaluating hydration & barrier lipid integrity...",
  "Analyzing sebum balance & micro-texture...",
  "Matching dermatological skincare actives...",
]

export function AISkinScanModal() {
  const isOpen = useSkinScan((state) => state.isOpen)
  const closeModal = useSkinScan((state) => state.close)
  const addLine = useCart((state) => state.addLine)
  const openCart = useCart((state) => state.openCart)

  const [step, setStep] = useState<ScanStep>("intro")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [currentScanStepIdx, setCurrentScanStepIdx] = useState(0)
  const [result, setResult] = useState<AISkinAnalysisResult | null>(null)
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep("intro")
      setPhotoPreview(null)
      setResult(null)
      setCurrentScanStepIdx(0)
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        closeModal()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, closeModal])

  async function startScan(photoUrl?: string) {
    setPhotoPreview(photoUrl ?? "/assets/ai/ai-face-sonar.svg")
    setStep("scanning")
    setCurrentScanStepIdx(0)

    // Progress step timers
    const t1 = setTimeout(() => setCurrentScanStepIdx(1), 600)
    const t2 = setTimeout(() => setCurrentScanStepIdx(2), 1200)
    const t3 = setTimeout(() => setCurrentScanStepIdx(3), 1800)

    try {
      const res = await aiService.analyzeSkin(photoUrl)
      setResult(res)
      setTimeout(() => {
        setStep("results")
      }, 2400)
    } catch (err) {
      console.error("AI scan failed:", err)
      setStep("intro")
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const url = event.target?.result as string
        startScan(url)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleAddToCart(productHandle: string) {
    if (!result) return
    const recommendation = result.routineSteps.find((s) => s.productHandle === productHandle)
    if (recommendation?.product) {
      const product = recommendation.product
      const variant = product.variants[0] || {
        id: `${product.id}-default`,
        title: "Default",
        price: product.price,
        inStock: true,
      }
      addLine({
        variantId: variant.id,
        productId: product.id,
        handle: product.handle,
        title: product.title,
        variantTitle: variant.title,
        brand: product.brand,
        price: variant.price,
        image: product.images[0] || "/placeholder.svg",
        quantity: 1,
      })
      setAddedItems((prev) => ({ ...prev, [productHandle]: true }))
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [productHandle]: false }))
      }, 2500)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Skin Analysis"
        className="relative z-10 my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white text-black shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[12px] font-black text-white">
              AI
            </span>
            <span className="text-[16px] font-bold tracking-tight text-black">AI Skin Analysis</span>
          </div>

          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="rounded-full p-2 text-black/50 transition hover:bg-surface hover:text-black"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[78vh] overflow-y-auto p-6">
          {/* STEP 1: INTRODUCTION */}
          {step === "intro" && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-[#f5f5f5] p-3 border border-border-subtle shadow-md">
                <Image
                  src="/assets/ai/ai-body-sketch.svg"
                  alt="AI Body Sizing Sketch"
                  width={100}
                  height={100}
                  className="object-contain animate-pulse"
                />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f5] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-black border border-border-subtle">
                <Sparkles size={12} />
                <span>3D Body Measurement &amp; Size Diagnostic</span>
              </span>

              <h2 className="mt-3 text-[22px] font-extrabold text-black sm:text-[26px]">
                Discover Your Perfect Apparel &amp; Footwear Fit
              </h2>

              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#555555]">
                Our computer vision analyzes body proportions, shoulder width, chest, waist and inseam geometry to recommend your exact Zara and EU/US standard size.
              </p>

              {/* Privacy Notice */}
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#f7f8f9] px-4 py-2.5 text-[12px] text-subtext">
                <ShieldCheck size={16} className="shrink-0 text-black" />
                <span>Your photo is analyzed in real-time in your browser and is never stored.</span>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-black text-[13px] font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#262626] hover:scale-[1.01] active:scale-98"
                >
                  <Camera size={18} strokeWidth={2} />
                  <span>Take or Upload Body Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => startScan()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white text-[12px] font-bold uppercase tracking-wider text-black transition hover:border-black"
                >
                  <Sparkles size={14} className="text-black" />
                  <span>Run Demo Body Size Scan</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING IN PROGRESS */}
          {step === "scanning" && (
            <div className="flex flex-col items-center text-center py-8">
              {/* Scanning Body Viewport */}
              <div className="relative mb-6 flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl border-2 border-black bg-[#f5f5f5] shadow-lg">
                <Image
                  src={photoPreview || "/assets/ai/ai-body-sketch.svg"}
                  alt="Scanning photo"
                  fill
                  className="object-contain p-4 opacity-75"
                />

                {/* Radar Rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute h-36 w-36 rounded-full border border-black/40 animate-ping" />
                  <span className="absolute h-24 w-24 rounded-full border border-black/60" />
                </div>

                {/* Laser Scanning Bar */}
                <div className="absolute inset-x-0 h-1 bg-linear-to-r from-transparent via-black to-transparent shadow-[0_0_12px_#000000] animate-bounce" />
              </div>

              <h3 className="text-[18px] font-bold text-black">Analyzing Body Measurements &amp; Proportions...</h3>
              <p className="mt-1 text-[13px] text-black font-semibold">
                {SCAN_STEPS_TEXT[currentScanStepIdx]}
              </p>

              {/* Progress Bar */}
              <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-[#f0f0f0]">
                <div
                  className="h-full bg-brand transition-all duration-500 rounded-full"
                  style={{ width: `${(currentScanStepIdx + 1) * 25}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS & PRODUCT RECOMMENDATIONS */}
          {step === "results" && result && (
            <div className="space-y-6 py-2">
              {/* Top Result Banner */}
              <div className="rounded-2xl border border-brand/25 bg-linear-to-br from-[#fdf4fa] to-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/15 pb-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand">
                      Skin Diagnosis
                    </span>
                    <h3 className="text-[22px] font-bold text-black">{result.skinType} Skin</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand px-3 py-1 text-[13px] font-bold text-white shadow-xs">
                      {result.analysisScore}/100 Match
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[14px] leading-relaxed text-[#444444]">
                  {result.summary}
                </p>

                {/* Identified Concerns */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold text-black">Primary Concerns:</span>
                  {result.concerns.map((concern) => (
                    <span
                      key={concern}
                      className="rounded-full border border-brand/25 bg-white px-3 py-0.5 text-[12px] font-semibold text-brand"
                    >
                      {concern}
                    </span>
                  ))}
                </div>

                {/* Metrics Grid */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Hydration", value: result.metrics.hydration },
                    { label: "Oil Balance", value: result.metrics.oilBalance },
                    { label: "Sensitivity", value: result.metrics.sensitivity },
                    { label: "Texture", value: result.metrics.texture },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-border-subtle bg-white p-3 text-center">
                      <p className="text-[11px] font-medium text-subtext">{m.label}</p>
                      <p className="text-[16px] font-bold text-black">{m.value}%</p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#f0f0f0]">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${m.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Routine & Products */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-[17px] font-bold text-black">Recommended For You</h4>
                  <span className="text-[12px] font-medium text-subtext">Custom Routine</span>
                </div>

                <div className="space-y-4">
                  {result.routineSteps.map((step, idx) => (
                    <div
                      key={step.step}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-white p-4 transition hover:border-black/30"
                    >
                      <div className="flex items-center gap-4">
                        {/* Step Badge */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface font-bold text-[13px] text-black">
                          0{idx + 1}
                        </div>

                        {/* Product Thumbnail if available */}
                        {step.product && (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                            <Image
                              src={step.product.images[0] || "/placeholder.svg"}
                              alt={step.product.title}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        )}

                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                            {step.step}: {step.title}
                          </span>
                          <h5 className="text-[14px] font-bold text-black line-clamp-1">
                            {step.product?.title || step.title}
                          </h5>
                          <p className="text-[12px] text-subtext line-clamp-1">{step.reason}</p>
                          {step.product && (
                            <div className="mt-1">
                              <Price amount={step.product.price} className="text-[14px] font-bold text-black" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Add to Cart CTA */}
                      {step.product && (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(step.productHandle)}
                          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-brand px-4 text-[13px] font-bold text-white transition hover:bg-brand-dark shadow-xs"
                        >
                          {addedItems[step.productHandle] ? (
                            <>
                              <Check size={14} strokeWidth={2.4} />
                              <span>Added!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={14} />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => setStep("intro")}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-subtext transition hover:text-black"
                >
                  <RotateCcw size={14} />
                  <span>Retake Scan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeModal()
                    openCart()
                  }}
                  className="flex h-11 items-center gap-2 rounded-[10px] bg-black px-6 text-[14px] font-bold uppercase tracking-wider text-white transition hover:bg-black/80 shadow-sm"
                >
                  <span>View in Cart</span>
                  <ArrowRight size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
