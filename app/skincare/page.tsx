"use client"

import { Sparkles, Shield, Heart } from "lucide-react"
import { ComingSoonPage } from "@/components/site/coming-soon-page"

export default function SkincareComingSoonPage() {
  return (
    <ComingSoonPage
      title="Skincare"
      eyebrow="Department teaser · Launching soon"
      description="We're building a medical-grade dermocosmetics and botanical skincare edit — clinical formulas, AI skin tips, and launch-day access for waitlist members."
      features={[
        {
          icon: Shield,
          title: "Clinical dermocosmetics",
          body: "Barrier repair and dermatologist-trusted lines, verified authentic for Lebanon delivery.",
        },
        {
          icon: Sparkles,
          title: "Smart routines",
          body: "Skin-aware recommendations so you shop products that match your goals — not guesswork.",
        },
        {
          icon: Heart,
          title: "Clean & tested",
          body: "Hypoallergenic picks, cruelty-conscious brands, and clear ingredient transparency.",
        },
      ]}
    />
  )
}
