import aiData from "./ai-data.json"
import { getProduct } from "./products"
import type { Product } from "@/types/ecommerce"

export type SkinMetric = {
  hydration: number
  oilBalance: number
  sensitivity: number
  texture: number
}

export type RoutineRecommendation = {
  step: string
  title: string
  productHandle: string
  reason: string
  product?: Product
}

export type AISkinAnalysisResult = {
  id: string
  skinType: string
  concerns: string[]
  analysisScore: number
  metrics: SkinMetric
  summary: string
  routineSteps: RoutineRecommendation[]
  timestamp: string
}

class AISkinService {
  /**
   * Performs simulated AI skin analysis on uploaded photo or sample scan.
   * Architecture ready for future live API integration.
   */
  async analyzeSkin(photoDataUrl?: string): Promise<AISkinAnalysisResult> {
    // Artificial delay to simulate real computer vision / deep learning inference
    await new Promise((resolve) => setTimeout(resolve, 2400))

    // Select profile (or pseudo-random profile for realistic simulation)
    const profiles = aiData.skinProfiles
    const selected = profiles[Math.floor(Math.random() * profiles.length)]

    // Hydrate products
    const routineWithProducts: RoutineRecommendation[] = selected.routineSteps.map((step) => {
      const product = getProduct(step.productHandle)
      return {
        ...step,
        product: product ?? undefined,
      }
    })

    return {
      id: `scan-${Date.now()}`,
      skinType: selected.skinType,
      concerns: selected.concerns,
      analysisScore: selected.analysisScore,
      metrics: selected.metrics,
      summary: selected.summary,
      routineSteps: routineWithProducts,
      timestamp: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }
  }
}

export const aiService = new AISkinService()
