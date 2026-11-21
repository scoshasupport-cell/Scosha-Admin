import { NextResponse } from "next/server"
import type { AISkinScanResult } from "@/types/ecommerce"
import { PRODUCTS } from "@/lib/products"

/**
 * Simulated skin analysis.
 *
 * The client sends lightweight image statistics (average brightness, red
 * dominance and pixel variance) extracted from the captured frame via the
 * Canvas API. We derive plausible 0–100 scores from those signals so the
 * experience feels responsive to the actual photo — no image is ever stored.
 */

interface AnalysisInput {
  brightness?: number // 0..255
  redness?: number // 0..1 relative red channel dominance
  variance?: number // 0..1 normalised luminance variance (texture proxy)
}

function clamp(n: number, min = 8, max = 98) {
  return Math.round(Math.max(min, Math.min(max, n)))
}

function jitter(base: number, spread = 6) {
  return base + (Math.random() * spread * 2 - spread)
}

const CONCERN_PRODUCTS: Record<string, string[]> = {
  Redness: PRODUCTS.filter((p) => p.isDermoCosmetic || /redness|sensitive/i.test(p.title)).slice(0, 2).map((p) => p.id),
  Blemishes: PRODUCTS.filter((p) => /acne|blemish|effaclar|cleanser/i.test(p.title) || p.isDermoCosmetic).slice(0, 2).map((p) => p.id),
  Hydration: PRODUCTS.filter((p) => p.category === "Skincare" || /hydrat|serum|moistur/i.test(p.title)).slice(0, 2).map((p) => p.id),
  "Fine Lines": PRODUCTS.filter((p) => /retinol|anti-aging|cream/i.test(p.title)).slice(0, 2).map((p) => p.id),
  Texture: PRODUCTS.filter((p) => p.category === "Skincare" || p.category === "K-Beauty").slice(0, 2).map((p) => p.id),
}

export async function POST(request: Request) {
  let input: AnalysisInput = {}
  try {
    input = await request.json()
  } catch {
    // ignore — fall back to randomised demo values
  }

  const brightness = input.brightness ?? 128
  const redness = input.redness ?? 0.34
  const variance = input.variance ?? 0.4

  // Derive scores (higher = better skin condition for that metric).
  const hydration = clamp(jitter(40 + (brightness / 255) * 45))
  const redScore = clamp(jitter(100 - redness * 150)) // higher redness signal -> lower score
  const blemishes = clamp(jitter(95 - variance * 70))
  const wrinkles = clamp(jitter(88 - variance * 45))
  const texture = clamp(jitter(90 - variance * 60))

  const scores = {
    hydration,
    redness: redScore,
    blemishes,
    wrinkles,
    texture,
  }

  // The lowest score is the primary concern.
  const metricToConcern: Record<keyof typeof scores, string> = {
    hydration: "Hydration",
    redness: "Redness",
    blemishes: "Blemishes",
    wrinkles: "Fine Lines",
    texture: "Texture",
  }

  const sorted = (Object.keys(scores) as (keyof typeof scores)[]).sort((a, b) => scores[a] - scores[b])
  const primaryConcern = metricToConcern[sorted[0]]
  const secondaryConcern = metricToConcern[sorted[1]]

  const recommendedProductIds = Array.from(
    new Set([...(CONCERN_PRODUCTS[primaryConcern] ?? []), ...(CONCERN_PRODUCTS[secondaryConcern] ?? [])]),
  ).slice(0, 4)

  const result: AISkinScanResult = { scores, primaryConcern, recommendedProductIds }

  // Small artificial delay to mimic model inference.
  await new Promise((r) => setTimeout(r, 1400))

  return NextResponse.json(result)
}
