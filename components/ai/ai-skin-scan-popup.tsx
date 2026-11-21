"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useSkinScan } from "@/lib/store"

const STORAGE_KEY = "scosha_ai_scan_dismissed"

export function AISkinScanPopup() {
  const openModal = useSkinScan((state) => state.open)
  const isModalOpen = useSkinScan((state) => state.isOpen)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if dismissed in this session
    if (typeof window === "undefined") return
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (dismissed === "1") return

    // Show popup after brief delay
    const timer = window.setTimeout(() => {
      setVisible(true)
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [])

  function handleDismiss() {
    setVisible(false)
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "1")
    }
  }

  function handleScanNow() {
    setVisible(false)
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "1")
    }
    openModal()
  }

  // Hide popup if main modal is active
  if (isModalOpen) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="fixed bottom-5 right-4 z-50 w-[90vw] max-w-85 rounded-2xl border border-brand/20 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:bottom-6 sm:right-6 sm:w-85"
          role="dialog"
          aria-label="AI Skin Scan Promotion"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close AI skin scan"
            className="absolute right-3.5 top-3.5 rounded-full p-1 text-black/40 transition hover:bg-[#f3f4f6] hover:text-black"
          >
            <X size={16} strokeWidth={2} />
          </button>

          {/* Visual: Body Sketch + Sizing Graphic */}
          <div className="mb-4 flex items-center justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f5f5f5] p-2 border border-border-subtle shadow-inner">
              <Image
                src="/assets/ai/ai-body-sketch.svg"
                alt="AI Body & Sizing Scan"
                width={72}
                height={72}
                className="object-contain animate-pulse"
                priority
              />
            </div>
          </div>

          {/* Content Header & Body */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f5] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black border border-border-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-black animate-ping" />
              <span>AI Body &amp; Size Scan</span>
            </div>

            <h3 className="mt-2 text-[16px] font-extrabold leading-tight text-black">
              Unsure what size fits your body?
            </h3>

            <p className="mt-1.5 text-[12px] leading-relaxed text-subtext">
              Precision body measurement &amp; size recommendation. 100% on-device.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleScanNow}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-black text-[13px] font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#262626] active:scale-98"
            >
              <span>Scan Body Fit</span>
              <ArrowRight size={14} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-1 text-center text-[12px] font-medium text-subtext transition hover:text-black hover:underline"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
