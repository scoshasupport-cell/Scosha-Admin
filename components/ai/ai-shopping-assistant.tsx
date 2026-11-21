"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  X,
  Camera,
  Upload,
  Sparkles,
  UserRound,
  PersonStanding,
  ImageIcon,
  Loader2,
  ShoppingBag,
  AlertCircle,
  ArrowLeft,
  Check,
  Sofa,
  Ruler,
  Shirt,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useSkinScan } from "@/lib/store"
import { useModalFocus } from "@/hooks/useModalFocus"
import { useBagCart } from "@/hooks/useBagCart"
import { api, ApiError, API_BASE_URL, getOrCreateGuestSessionId } from "@/lib/api"
import { Price } from "@/components/price"
import { CATEGORY_ROUTES } from "@/lib/category-routes"
import { cartKeys } from "@/hooks/useCart"

type Mode = "home" | "face" | "body" | "furniture" | "auto"
type BodyArea = "full" | "upper" | "legs" | "shoes" | "bags"
type Gender = "women" | "men"

type RecVariant = {
  id: string
  size: string
  colorName?: string
  colorHex?: string
  stock: number
  price: number
  inStock: boolean
}

type Recommendation = {
  id: string
  title: string
  handle: string
  brand: string
  price: number
  compareAtPrice?: number | null
  image: string
  sizes: string[]
  variants: RecVariant[]
  inStock: boolean
  subCategory?: string
  productType?: string | null
  slot?: string | null
  suggestedSize?: string | null
  sizeNote?: string | null
  reason?: string | null
  tryOnSupported?: boolean
}

type AnalyzeStatus =
  | "ok"
  | "no_matches"
  | "mismatch"
  | "unsupported"
  | "unclear"
  | "needs_input"
  | "error"

type AnalyzeMode = "face" | "body" | "furniture" | "auto"

type Suggestion =
  | { action: "switch_mode"; mode: AnalyzeMode; label: string }
  | { action: "retake"; label: string }

type AnalyzeResult = {
  mode: string
  status?: AnalyzeStatus
  pipeline?: "face" | "body" | "furniture" | null
  imageType?: string
  confidence?: number
  comingSoon?: boolean
  beautyHref?: string
  beautyCatalogLive?: boolean
  message?: string
  providerNote?: string
  suggestedMode?: AnalyzeMode | null
  suggestions?: Suggestion[]
  needsInput?: { field: "gender" | "imageType"; options: string[]; message?: string }
  catalogNote?: string | null
  analysis?: {
    scores?: Record<string, number>
    concerns?: string[]
    notes?: string
    skinReport?: SkinReport
    bodyReport?: BodyReport
    furnitureReport?: FurnitureReport
  }
  skinReport?: SkinReport
  bodyReport?: BodyReport
  furnitureReport?: FurnitureReport
  scene?: FurnitureReport
  analysisError?: string
  recommendations?: Recommendation[]
  recommendationCount?: number
  needsClarification?: string[]
  fileId?: string | null
  gaps?: string[]
  measurements?: {
    suggestedLetterSize?: string | null
    sizeChecked?: boolean
    sizeSource?: string | null
    profileNote?: string | null
  }
  tryOnAvailable?: boolean
  gender?: string
  genderSource?: string
  genderConflict?: boolean
}

type BodyReport = {
  garments?: { slot?: string; type?: string; colors?: string[] }[]
  styleTags?: string[]
  season?: string
  occasion?: string
  dominantColors?: string[]
  build?: string
  notes?: string
  lookingFor?: string[]
}

type SkinReport = {
  skinType?: string
  skinTone?: string
  undertone?: string
  faceShape?: string
  concerns?: string[]
  careTips?: { step: string; tip: string }[]
  summary?: string
  perfectCorpScores?: Record<string, number>
}

type FurnitureReport = {
  furnitureType?: string
  roomType?: string
  style?: string
  colors?: string[]
  complements?: string[]
  notes?: string
  confidence?: number
}

type Measurements = {
  age: string
  height: string
  weight: string
  chest: string
  waist: string
  hips: string
  arm: string
  shoeSize: string
  unit: "cm" | "in"
}

type Step =
  | "pick"
  | "capture"
  | "measurements"
  | "gender"
  | "clarify"
  | "blocked"
  | "analyzing"
  | "results"
  | "tryon"

const MODE_LABEL: Record<AnalyzeMode, string> = {
  face: "Face scan",
  body: "Body scan",
  furniture: "Furniture scan",
  auto: "Smart upload",
}

const EMPTY_MEASUREMENTS: Measurements = {
  age: "",
  height: "",
  weight: "",
  chest: "",
  waist: "",
  hips: "",
  arm: "",
  shoeSize: "",
  unit: "cm",
}

function extractPalette(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const size = 48
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve([])
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        const buckets = new Map<string, number>()
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          if (a < 128) continue
          const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
          buckets.set(hex, (buckets.get(hex) || 0) + 1)
        }
        const top = [...buckets.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([hex]) => hex)
        resolve(top)
      } catch {
        resolve([])
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve([])
    }
    img.src = url
  })
}

function authHeaders(): Headers {
  const h = new Headers()
  const guest = getOrCreateGuestSessionId()
  if (guest) h.set("X-Guest-Session-Id", guest)
  return h
}

export function AIShoppingAssistant() {
  const isOpen = useSkinScan((s) => s.isOpen)
  const close = useSkinScan((s) => s.close)
  const dialogRef = useModalFocus(isOpen, close)
  const { openCart } = useBagCart()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<Mode>("home")
  const [step, setStep] = useState<Step>("pick")
  const [gender, setGender] = useState<Gender | null>(null)
  const [bodyArea, setBodyArea] = useState<BodyArea>("full")
  const [measurements, setMeasurements] = useState<Measurements>(EMPTY_MEASUREMENTS)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sizeMap, setSizeMap] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [tryOnProductId, setTryOnProductId] = useState<string | null>(null)
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null)
  const [tryOnLoading, setTryOnLoading] = useState(false)
  const [status, setStatus] = useState<{
    perfectCorpConfigured?: boolean
    perfectCorpKeyValid?: boolean | null
    perfectCorpKeyError?: string | null
    missingServices?: { id: string; name: string; why: string }[]
  } | null>(null)

  const galleryInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const reset = useCallback(() => {
    stopCamera()
    setMode("home")
    setStep("pick")
    setGender(null)
    setBodyArea("full")
    setMeasurements(EMPTY_MEASUREMENTS)
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    setSizeMap({})
    setSelected({})
    setAdding(false)
    setTryOnProductId(null)
    setTryOnUrl(null)
    setTryOnLoading(false)
  }, [stopCamera])

  useEffect(() => {
    if (isOpen) {
      reset()
      api
        .get<{
          perfectCorpConfigured?: boolean
          perfectCorpKeyValid?: boolean | null
          perfectCorpKeyError?: string | null
          missingServices?: { id: string; name: string; why: string }[]
        }>("/ai-assistant/status")
        .then((res) => setStatus(res.data))
        .catch(() => setStatus(null))
    } else {
      stopCamera()
    }
  }, [isOpen, reset, stopCamera])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, close])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode === "face" ? "user" : "environment" },
        audio: false,
      })
      streamRef.current = stream
      setCameraOn(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError("Camera permission denied. You can upload a photo instead.")
    }
  }

  function afterPhotoReady(f: File, activeMode: Mode = mode) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    stopCamera()

    if (activeMode === "face" || activeMode === "body") {
      setStep("measurements")
      return
    }
    if (activeMode === "furniture") {
      void runAnalyze(f, "furniture")
      return
    }
    void runAnalyze(f, "auto")
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 960
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const f = new File([blob], "capture.jpg", { type: "image/jpeg" })
        afterPhotoReady(f)
      },
      "image/jpeg",
      0.92,
    )
  }

  function onFilePicked(f: File, nextMode: Mode) {
    setMode(nextMode)
    afterPhotoReady(f, nextMode)
  }

  function validateProfile(): string | null {
    if (!gender) return "Choose Women or Men."
    const age = Number(measurements.age)
    if (!measurements.age.trim() || !Number.isFinite(age) || age < 1 || age > 120) {
      return "Age is required (1–120)."
    }
    const imperial = measurements.unit === "in"
    if (measurements.height.trim()) {
      const h = Number(measurements.height)
      const ok = imperial ? h >= 20 && h <= 90 : h >= 50 && h <= 230
      if (!Number.isFinite(h) || !ok) {
        return imperial ? "Enter height in inches (20–90)." : "Enter height in centimeters (50–230)."
      }
    }
    if (measurements.weight.trim()) {
      const w = Number(measurements.weight)
      const ok = imperial ? w >= 15 && w <= 550 : w >= 8 && w <= 250
      if (!Number.isFinite(w) || !ok) {
        return imperial ? "Enter weight in pounds (15–550)." : "Enter weight in kilograms (8–250)."
      }
    }
    return null
  }

  /** Re-run the analysis in a different pipeline (from a mismatch suggestion or an "unclear" prompt). */
  function switchToMode(nextMode: AnalyzeMode, opts: { confirmed?: boolean } = {}) {
    if (!file) {
      setStep("capture")
      return
    }
    setMode(nextMode)
    if ((nextMode === "face" || nextMode === "body") && (!gender || !measurements.age.trim())) {
      setStep("measurements")
      return
    }
    void runAnalyze(file, nextMode, undefined, opts)
  }

  async function runAnalyze(
    activeFile: File,
    analyzeMode: AnalyzeMode,
    overrideGender?: Gender | null,
    opts: { confirmed?: boolean } = {},
  ) {
    setStep("analyzing")
    setError(null)
    setResult(null)
    setTryOnUrl(null)
    try {
      const colors = await extractPalette(activeFile)
      const form = new FormData()
      form.append("image", activeFile)
      form.append("mode", analyzeMode)
      const g = overrideGender ?? gender
      if (g) form.append("gender", g)
      form.append("bodyArea", bodyArea)
      form.append("colors", JSON.stringify(colors))
      if (opts.confirmed) form.append("confirmed", "1")
      if (analyzeMode === "body" || analyzeMode === "face") {
        form.append(
          "measurements",
          JSON.stringify({
            age: measurements.age || undefined,
            height: measurements.height || undefined,
            weight: measurements.weight || undefined,
            chest: analyzeMode === "body" ? measurements.chest || undefined : undefined,
            waist: analyzeMode === "body" ? measurements.waist || undefined : undefined,
            hips: analyzeMode === "body" ? measurements.hips || undefined : undefined,
            arm: analyzeMode === "body" ? measurements.arm || undefined : undefined,
            shoeSize: analyzeMode === "body" ? measurements.shoeSize || undefined : undefined,
            unit: measurements.unit,
          }),
        )
      }

      const res = await fetch(`${API_BASE_URL}/ai-assistant/analyze`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: form,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new ApiError(json?.message || "Analysis failed", res.status, json)
      }
      const data = (json?.data || json) as AnalyzeResult
      setResult(data)

      const status: AnalyzeStatus =
        data.status ||
        (data.needsClarification?.includes("gender")
          ? "needs_input"
          : data.needsClarification?.length
            ? "unclear"
            : "ok")

      if (status === "needs_input" && (data.needsInput?.field ?? "gender") === "gender") {
        setStep("gender")
        return
      }
      if (status === "unclear") {
        setStep("clarify")
        return
      }
      if (status === "mismatch" || status === "unsupported" || status === "error") {
        setStep("blocked")
        return
      }

      const recs = (data.recommendations || []).slice(0, 5)
      const nextSelected: Record<string, boolean> = {}
      const nextSizes: Record<string, string> = {}
      for (const r of recs) {
        nextSelected[r.id] = true
        nextSizes[r.id] = r.suggestedSize || ""
      }
      setSelected(nextSelected)
      setSizeMap(nextSizes)
      setStep("results")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze photo")
      setStep("capture")
    }
  }

  function retakePhoto() {
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    if (mode === "auto" || mode === "home") {
      setMode("auto")
      galleryInputRef.current?.click()
      return
    }
    setStep("capture")
  }

  async function runTryOn(productId: string) {
    if (!file && !result?.fileId) {
      toast.error("Scan photo required for try-on")
      return
    }
    setTryOnProductId(productId)
    setTryOnLoading(true)
    setTryOnUrl(null)
    setStep("tryon")
    try {
      const form = new FormData()
      if (file) form.append("image", file)
      form.append("productId", productId)
      if (result?.fileId) form.append("personFileId", result.fileId)

      const res = await fetch(`${API_BASE_URL}/ai-assistant/try-on`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: form,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new ApiError(json?.message || "Try-on failed", res.status, json)
      }
      const data = json?.data || json
      if (data?.resultUrl) {
        setTryOnUrl(data.resultUrl)
      } else {
        toast.message(data?.message || "Try-on completed without an image URL")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Try-on unavailable")
      setStep("results")
    } finally {
      setTryOnLoading(false)
    }
  }

  const recommendations = (result?.recommendations || []).slice(0, 5)
  const selectedCount = useMemo(
    () => recommendations.filter((r) => selected[r.id]).length,
    [recommendations, selected],
  )

  function pickVariant(rec: Recommendation): RecVariant | null {
    const size = sizeMap[rec.id]
    if (!size) return null
    return (
      rec.variants.find((v) => v.size === size && v.inStock) ||
      rec.variants.find((v) => v.size === size) ||
      null
    )
  }

  async function addSelectedToCart() {
    const chosen = recommendations.filter((r) => selected[r.id])
    if (!chosen.length) {
      toast.error("Select at least one product")
      return
    }
    for (const rec of chosen) {
      if (rec.sizes.length && !sizeMap[rec.id]) {
        toast.error(`Select a size for ${rec.title}`)
        return
      }
      if (rec.sizes.length) {
        const variant = pickVariant(rec)
        if (!variant?.inStock) {
          toast.error(`${rec.title} is out of stock in that size`)
          return
        }
      }
    }

    setAdding(true)
    let ok = 0
    try {
      for (const rec of chosen) {
        if (rec.sizes.length) {
          const variant = pickVariant(rec)!
          await api.post("/cart/items", { variantId: variant.id, quantity: 1 })
        } else {
          const any = rec.variants.find((v) => v.inStock)
          if (!any) continue
          await api.post("/cart/items", { variantId: any.id, quantity: 1 })
        }
        ok += 1
      }
      await queryClient.invalidateQueries({ queryKey: cartKeys.all })
      toast.success(`Added ${ok} item${ok === 1 ? "" : "s"} to your bag`)
      openCart()
      close()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update bag")
    } finally {
      setAdding(false)
    }
  }

  function goBack() {
    stopCamera()
    setStep("pick")
    setMode("home")
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    setTryOnUrl(null)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          role="dialog"
          aria-modal
          aria-label="AI Personal Shopping Assistant"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              {step !== "pick" && mode !== "home" && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-full p-1.5 text-subtext hover:bg-surface"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-[11px] font-black tracking-wide text-white shadow-sm">
                AI
              </div>
              <div>
                <p className="text-sm font-bold text-primary-text">Shopping Assistant</p>
                <p className="text-[11px] text-muted">Scosha · live catalog · private</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full p-2 text-subtext hover:bg-surface"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {step === "pick" && (
              <div className="space-y-3">
                <p className="text-sm text-subtext">
                  Scan your face, body, or furniture — or upload any photo. We show up to 5
                  in-stock Scosha products that genuinely fit, and tell you honestly when nothing does.
                </p>
                {status && (!status.perfectCorpConfigured || status.perfectCorpKeyValid === false) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    {!status.perfectCorpConfigured ? (
                      <>
                        Perfect Corp API key is not set. Catalog matching still works; face analysis
                        needs <code className="font-mono">PERFECT_CORP_API_KEY</code>.
                      </>
                    ) : (
                      <>
                        Perfect Corp rejected this API key. Update it in{" "}
                        <code className="font-mono">backend/.env</code>.
                      </>
                    )}
                  </div>
                )}

                {(
                  [
                    {
                      id: "face" as const,
                      icon: UserRound,
                      title: "Scan Face",
                      desc: "Beauty, sunglasses, hats & accessories",
                    },
                    {
                      id: "body" as const,
                      icon: PersonStanding,
                      title: "Scan Body",
                      desc: "Outfit pieces that complement your look, size-checked",
                    },
                    {
                      id: "furniture" as const,
                      icon: Sofa,
                      title: "Scan Furniture",
                      desc: "Cushions, throws & curtains that suit your space",
                    },
                    {
                      id: "auto" as const,
                      icon: ImageIcon,
                      title: "Smart Upload",
                      desc: "Auto-detect face, body, or home photo",
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id)
                      if (item.id === "auto") {
                        galleryInputRef.current?.click()
                      } else {
                        setStep("capture")
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3.5 text-left transition hover:border-black/30 hover:bg-white"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black shadow-sm">
                      <item.icon size={20} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-primary-text">{item.title}</span>
                      <span className="text-[12px] text-muted">{item.desc}</span>
                    </span>
                    {item.id === "auto" ? (
                      <Upload className="ml-auto text-muted" size={16} />
                    ) : (
                      <Sparkles className="ml-auto text-muted" size={16} />
                    )}
                  </button>
                ))}

                <p className="pt-1 text-[11px] leading-relaxed text-muted">
                  Photos are processed for recommendations and are not stored in your Scosha account.
                  Perfect Corp may temporarily hold files for AI tasks per their API policy.
                </p>
              </div>
            )}

            {step === "capture" && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-primary-text">
                  {mode === "face"
                    ? "Face scan"
                    : mode === "body"
                      ? "Body / part scan"
                      : mode === "furniture"
                        ? "Furniture scan"
                        : "Upload"}
                </p>

                {mode === "body" && (
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["full", "Full body"],
                        ["upper", "Upper / arms"],
                        ["legs", "Legs"],
                        ["shoes", "Shoes"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setBodyArea(id)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                          bodyArea === id
                            ? "bg-black text-white"
                            : "border border-border-subtle bg-white text-subtext"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {preview ? (
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
                    <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
                  </div>
                ) : cameraOn ? (
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
                    <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-surface text-center">
                    <Camera className="text-muted" size={28} />
                    <p className="px-6 text-sm text-subtext">Use your camera or upload a photo</p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {!cameraOn ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white"
                    >
                      <Camera size={16} /> Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={captureFrame}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white"
                    >
                      Capture
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle text-sm font-bold text-primary-text"
                  >
                    <Upload size={16} /> Upload
                  </button>
                </div>
              </div>
            )}

            {step === "measurements" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Ruler size={18} />
                  <p className="text-sm font-semibold text-primary-text">
                    {mode === "face" ? "Before your face scan" : "Before your body scan"}
                  </p>
                </div>
                <p className="text-[12px] text-muted">
                  Age is required. Gender, height, and weight help with size and style. We still
                  analyze the photo on its own, and follow the photo when it clearly disagrees with
                  what you type.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {(["women", "men"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`rounded-xl border px-3 py-3 text-sm font-bold uppercase ${
                        gender === g
                          ? "border-black bg-black text-white"
                          : "border-border-subtle text-primary-text"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <label className="block text-[11px] font-semibold text-muted">
                  Age <span className="text-brand">*</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    required
                    value={measurements.age}
                    onChange={(e) => setMeasurements((m) => ({ ...m, age: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border-subtle px-3 text-sm text-primary-text"
                    placeholder="Required"
                  />
                </label>

                <div className="flex gap-2">
                  {(
                    [
                      ["cm", "cm · kg"],
                      ["in", "in · lb"],
                    ] as const
                  ).map(([u, label]) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setMeasurements((m) => ({ ...m, unit: u }))}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                        measurements.unit === u
                          ? "bg-black text-white"
                          : "border border-border-subtle text-subtext"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["height", measurements.unit === "in" ? "Height (in)" : "Height (cm)"],
                      ["weight", measurements.unit === "in" ? "Weight (lb)" : "Weight (kg)"],
                      ...(mode === "body"
                        ? ([
                            ["chest", "Chest / bust"],
                            ["waist", "Waist"],
                            ["hips", "Hips"],
                            ["arm", "Arm"],
                            ["shoeSize", "Shoe size"],
                          ] as const)
                        : []),
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-[11px] font-semibold text-muted">
                      {label}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={measurements[key]}
                        onChange={(e) =>
                          setMeasurements((m) => ({ ...m, [key]: e.target.value }))
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-border-subtle px-3 text-sm text-primary-text"
                        placeholder={key === "shoeSize" ? "e.g. 42" : "Optional"}
                      />
                    </label>
                  ))}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!file}
                  onClick={() => {
                    const problem = validateProfile()
                    if (problem) {
                      setError(problem)
                      return
                    }
                    setError(null)
                    if (!file) return
                    void runAnalyze(file, mode === "face" ? "face" : "body")
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white disabled:opacity-50"
                >
                  {mode === "face" ? "Analyze my face" : "Find my outfit matches"}
                </button>
              </div>
            )}

            {step === "gender" && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-primary-text">Who are we shopping for?</p>
                <p className="text-[12px] text-muted">
                  {result?.message ||
                    "Required so we only show Men or Women catalog matches — never mixed."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["women", "men"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g)
                        if (file) {
                          // Stay in the pipeline the backend already resolved so the photo is not re-gated.
                          const analyzeMode: AnalyzeMode =
                            result?.pipeline ??
                            (mode === "auto"
                              ? "auto"
                              : mode === "face"
                                ? "face"
                                : mode === "furniture"
                                  ? "furniture"
                                  : "body")
                          if (result?.pipeline && result.pipeline !== mode) setMode(result.pipeline)
                          void runAnalyze(file, analyzeMode, g, { confirmed: true })
                        } else setStep("capture")
                      }}
                      className="rounded-2xl border border-border-subtle px-4 py-6 text-sm font-bold uppercase tracking-wider text-primary-text hover:border-black hover:bg-surface"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "clarify" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-subtle bg-surface p-4">
                  <p className="text-sm font-semibold text-primary-text">
                    {result?.needsClarification?.includes("gender")
                      ? "Who are we shopping for?"
                      : "What should we analyze?"}
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    {result?.needsInput?.message ||
                      result?.message ||
                      "We are not fully sure what this photo shows. Choose the closest match, or upload a clearer photo."}
                  </p>
                </div>
                {result?.needsClarification?.includes("gender") ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(["women", "men"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setGender(g)
                          if (file) void runAnalyze(file, result?.pipeline ?? "auto", g, { confirmed: true })
                        }}
                        className="flex h-11 items-center justify-center rounded-xl border border-border-subtle text-sm font-bold uppercase text-primary-text hover:bg-surface"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {(
                      (result?.needsInput?.options?.length
                        ? result.needsInput.options
                        : result?.needsClarification?.length
                          ? result.needsClarification
                          : ["face", "body", "furniture"]) as string[]
                    )
                      .filter((opt): opt is "face" | "body" | "furniture" =>
                        ["face", "body", "furniture"].includes(opt),
                      )
                      .map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => switchToMode(opt, { confirmed: true })}
                          className="flex h-11 items-center justify-center rounded-xl border border-border-subtle text-sm font-bold capitalize text-primary-text hover:bg-surface"
                        >
                          {opt === "body" ? "Body / clothing" : opt === "furniture" ? "Furniture / room" : "Face"}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white"
                    >
                      <Upload size={16} /> Upload a clearer photo
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === "blocked" && (
              <div className="space-y-4">
                {preview ? (
                  <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-2xl bg-surface-2">
                    <Image src={preview} alt="Your photo" fill className="object-cover" unoptimized />
                  </div>
                ) : null}
                <div
                  className={`flex items-start gap-2 rounded-2xl border p-4 text-sm ${
                    result?.status === "error"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {result?.status === "error"
                        ? "We could not analyze this photo"
                        : result?.status === "unsupported"
                          ? "This photo is not something we can shop for"
                          : `This does not look like a ${MODE_LABEL[(mode === "home" ? "auto" : mode) as AnalyzeMode].toLowerCase()} photo`}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed">
                      {result?.message || "Please try a different photo."}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {(result?.suggestions || [{ action: "retake", label: "Upload a different photo" }]).map(
                    (s) =>
                      s.action === "switch_mode" ? (
                        <button
                          key={`switch-${s.mode}`}
                          type="button"
                          onClick={() => switchToMode(s.mode, { confirmed: true })}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white"
                        >
                          <Sparkles size={16} /> {s.label}
                        </button>
                      ) : (
                        <button
                          key="retake"
                          type="button"
                          onClick={retakePhoto}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle text-sm font-bold text-primary-text"
                        >
                          <Upload size={16} /> {s.label}
                        </button>
                      ),
                  )}
                </div>
              </div>
            )}

            {step === "analyzing" && (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <Loader2 className="animate-spin text-black" size={32} />
                <p className="text-sm font-semibold text-primary-text">Analyzing your photo…</p>
                <p className="max-w-xs text-[12px] text-muted">
                  Understanding what is in the photo, then matching it against live Scosha stock.
                </p>
              </div>
            )}

            {step === "tryon" && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-primary-text">Virtual try-on</p>
                {tryOnLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="animate-spin" size={28} />
                    <p className="text-[12px] text-muted">Rendering with Perfect Corp Cloth V4…</p>
                  </div>
                ) : tryOnUrl ? (
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
                    <Image src={tryOnUrl} alt="Try-on result" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <p className="text-sm text-subtext">No try-on image returned for this item.</p>
                )}
                <button
                  type="button"
                  onClick={() => setStep("results")}
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-border-subtle text-sm font-bold"
                >
                  Back to matches
                </button>
              </div>
            )}

            {step === "results" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-primary-text">
                    {recommendations.length
                      ? `${recommendations.length} relevant match${recommendations.length === 1 ? "" : "es"}`
                      : "No relevant matches right now"}
                  </p>
                  <p className="text-[12px] text-muted">{result?.message}</p>
                  {result?.catalogNote ? (
                    <p className="mt-1 text-[11px] text-amber-800">{result.catalogNote}</p>
                  ) : null}
                  {result?.gender ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary-text">
                      Catalog: {result.gender}
                      {result.genderSource ? ` · via ${result.genderSource}` : ""}
                    </p>
                  ) : null}
                  {result?.genderConflict ? (
                    <p className="mt-1 text-[11px] text-amber-800">
                      The photo reads as {result.gender}, so these matches follow the photo rather than
                      the gender you entered.
                    </p>
                  ) : null}

                  {(result?.skinReport || result?.analysis?.skinReport) && (
                    <div className="mt-3 rounded-2xl border border-border-subtle bg-surface p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Skin analysis</p>
                      <p className="mt-1 text-[12px] text-primary-text">
                        {(result.skinReport || result.analysis?.skinReport)?.summary}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          (result.skinReport || result.analysis?.skinReport)?.skinType,
                          (result.skinReport || result.analysis?.skinReport)?.skinTone,
                          (result.skinReport || result.analysis?.skinReport)?.faceShape,
                        ]
                          .filter((v) => v && v !== "unknown")
                          .map((v) => (
                            <span
                              key={v}
                              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-text border border-border-subtle"
                            >
                              {v}
                            </span>
                          ))}
                        {((result.skinReport || result.analysis?.skinReport)?.concerns || []).map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      {((result.skinReport || result.analysis?.skinReport)?.careTips || []).length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {((result.skinReport || result.analysis?.skinReport)?.careTips || []).map((t) => (
                            <li key={t.step} className="text-[11px] text-subtext">
                              <span className="font-bold text-primary-text">{t.step}:</span> {t.tip}
                            </li>
                          ))}
                        </ul>
                      )}
                      {result?.comingSoon ? (
                        <p className="mt-2 text-[11px] text-amber-800">
                          Beauty products are not in the catalog yet — accessory matches below follow your face analysis.{" "}
                          <Link href={result.beautyHref || CATEGORY_ROUTES.beauty.href} onClick={close} className="underline">
                            Beauty page
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  )}

                  {(result?.bodyReport || result?.analysis?.bodyReport) && (
                    <div className="mt-3 rounded-2xl border border-border-subtle bg-surface p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Outfit analysis</p>
                      <p className="mt-1 text-[12px] text-primary-text">
                        {(result.bodyReport || result.analysis?.bodyReport)?.notes}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          ...((result.bodyReport || result.analysis?.bodyReport)?.styleTags || []).slice(0, 3),
                          (result.bodyReport || result.analysis?.bodyReport)?.season,
                          (result.bodyReport || result.analysis?.bodyReport)?.occasion,
                        ]
                          .filter((v) => v && v !== "unknown" && v !== "all")
                          .map((v) => (
                            <span
                              key={String(v)}
                              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-text border border-border-subtle"
                            >
                              {v}
                            </span>
                          ))}
                      </div>
                      {((result.bodyReport || result.analysis?.bodyReport)?.lookingFor || []).length > 0 && (
                        <p className="mt-2 text-[11px] text-subtext">
                          Looking for: {((result.bodyReport || result.analysis?.bodyReport)?.lookingFor || []).join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {(result?.furnitureReport || result?.scene) && (
                    <div className="mt-3 rounded-2xl border border-border-subtle bg-surface p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Room / furniture analysis</p>
                      <p className="mt-1 text-[12px] text-primary-text">
                        {(result.furnitureReport || result.scene)?.notes ||
                          `Detected ${(result.furnitureReport || result.scene)?.furnitureType || "home scene"}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          (result.furnitureReport || result.scene)?.furnitureType,
                          (result.furnitureReport || result.scene)?.style,
                          ...(((result.furnitureReport || result.scene)?.colors || []).slice(0, 3)),
                        ]
                          .filter((v) => v && v !== "none" && v !== "unknown" && v !== "other")
                          .map((v) => (
                            <span
                              key={String(v)}
                              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-text border border-border-subtle"
                            >
                              {v}
                            </span>
                          ))}
                      </div>
                      {((result.furnitureReport || result.scene)?.complements || []).length > 0 && (
                        <p className="mt-2 text-[11px] text-subtext">
                          Looking for: {((result.furnitureReport || result.scene)?.complements || []).join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {result?.comingSoon && !result?.beautyCatalogLive && !result?.skinReport && !result?.analysis?.skinReport ? (
                    <p className="mt-1 text-[11px] text-amber-800">
                      Beauty catalog is not live yet — showing accessory & style matches.{" "}
                      <Link href={result.beautyHref || CATEGORY_ROUTES.beauty.href} onClick={close} className="underline">
                        Visit Beauty
                      </Link>
                    </p>
                  ) : null}
                  {result?.measurements?.suggestedLetterSize ? (
                    <p className="mt-1 text-[11px] font-semibold text-primary-text">
                      {result.measurements.sizeSource === "height-weight"
                        ? `Size estimate from your height and weight, checked against the photo: ${result.measurements.suggestedLetterSize}`
                        : `Size estimate from your measurements: ${result.measurements.suggestedLetterSize}`}
                    </p>
                  ) : null}
                  {result?.measurements?.profileNote ? (
                    <p className="mt-1 text-[11px] text-amber-800">{result.measurements.profileNote}</p>
                  ) : null}
                </div>

                {(result?.suggestions || []).length > 0 && (
                  <div className="grid gap-2">
                    {(result?.suggestions || []).map((s) =>
                      s.action === "switch_mode" ? (
                        <button
                          key={`switch-${s.mode}`}
                          type="button"
                          onClick={() => switchToMode(s.mode, { confirmed: true })}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border-subtle text-[12px] font-bold text-primary-text hover:bg-surface"
                        >
                          <Sparkles size={14} /> {s.label}
                        </button>
                      ) : (
                        <button
                          key="retake"
                          type="button"
                          onClick={retakePhoto}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border-subtle text-[12px] font-bold text-primary-text hover:bg-surface"
                        >
                          <Upload size={14} /> {s.label}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {!recommendations.length ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border-subtle bg-surface p-4 text-sm text-subtext">
                      Nothing in the catalog reached a 50% match for this photo. Try another photo, or browse the catalog.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white"
                      >
                        <Upload size={16} /> Try another photo
                      </button>
                      <Link
                        href={
                          result?.pipeline === "furniture"
                            ? CATEGORY_ROUTES.home.href
                            : "/shop"
                        }
                        onClick={close}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle text-sm font-bold text-primary-text"
                      >
                        <ShoppingBag size={16} /> Browse shop
                      </Link>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recommendations.map((rec) => {
                      const sizes = rec.sizes.length
                        ? rec.sizes
                        : [...new Set(rec.variants.filter((v) => v.inStock).map((v) => v.size))]
                      return (
                        <li
                          key={rec.id}
                          className={`rounded-2xl border p-3 ${
                            selected[rec.id] ? "border-black/40 bg-surface" : "border-border-subtle"
                          }`}
                        >
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setSelected((s) => ({ ...s, [rec.id]: !s[rec.id] }))
                              }
                              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                selected[rec.id]
                                  ? "border-black bg-black text-white"
                                  : "border-border-subtle"
                              }`}
                              aria-label="Toggle product"
                            >
                              {selected[rec.id] ? <Check size={12} /> : null}
                            </button>
                            <Link
                              href={`/product/${rec.handle}`}
                              onClick={close}
                              className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2"
                            >
                              {rec.image ? (
                                <Image src={rec.image} alt={rec.title} fill className="object-cover" unoptimized />
                              ) : null}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">
                                  {rec.brand}
                                </p>
                                {rec.slot ? (
                                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                                    {rec.slot}
                                  </span>
                                ) : null}
                              </div>
                              <Link
                                href={`/product/${rec.handle}`}
                                onClick={close}
                                className="truncate text-sm font-bold text-primary-text hover:underline"
                              >
                                {rec.title}
                              </Link>
                              <Price amount={rec.price} className="mt-0.5 text-sm font-semibold" />
                              {rec.reason ? (
                                <p className="mt-0.5 text-[11px] text-muted">{rec.reason}</p>
                              ) : null}
                              {rec.sizeNote ? (
                                <p className="mt-0.5 text-[11px] font-semibold text-amber-800">{rec.sizeNote}</p>
                              ) : null}
                              {sizes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {sizes.map((sz) => (
                                    <button
                                      key={sz}
                                      type="button"
                                      disabled={!selected[rec.id]}
                                      onClick={() => setSizeMap((m) => ({ ...m, [rec.id]: sz }))}
                                      className={`min-w-9 rounded-md border px-2 py-1 text-[11px] font-bold ${
                                        sizeMap[rec.id] === sz
                                          ? "border-black bg-black text-white"
                                          : "border-border-subtle bg-white text-primary-text"
                                      } disabled:opacity-40`}
                                    >
                                      {sz}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {selected[rec.id] && sizes.length > 0 && !sizeMap[rec.id] ? (
                                <p className="mt-1 text-[11px] text-amber-700">Select a size</p>
                              ) : null}
                              {rec.tryOnSupported && result?.tryOnAvailable ? (
                                <button
                                  type="button"
                                  onClick={() => void runTryOn(rec.id)}
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary-text underline"
                                >
                                  <Shirt size={12} /> Try on
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {step === "results" && recommendations.length > 0 && (
            <div className="border-t border-border-subtle px-4 py-3 sm:px-5">
              <button
                type="button"
                disabled={adding || selectedCount === 0}
                onClick={() => void addSelectedToCart()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white disabled:opacity-50"
              >
                {adding ? <Loader2 className="animate-spin" size={18} /> : <ShoppingBag size={18} />}
                Add {selectedCount || ""} to bag
              </button>
            </div>
          )}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              if (mode === "body") onFilePicked(f, "body")
              else if (mode === "furniture") onFilePicked(f, "furniture")
              else if (mode === "face") onFilePicked(f, "face")
              else onFilePicked(f, "auto")
              e.target.value = ""
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
