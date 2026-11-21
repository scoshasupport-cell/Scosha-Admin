import { Hero } from "@/components/home/hero"
import { CategoryStrip } from "@/components/home/category-strip"
import { HomeProductRails } from "@/components/home/home-product-rails"
import { DressEditSwiper } from "@/components/home/dress-edit-swiper"
import { ScoshaEditGrid } from "@/components/home/scosha-edit-grid"
import { AiSizeScanBanner } from "@/components/home/ai-size-scan-banner"
import { WhatsTrending } from "@/components/home/whats-trending"

export default function HomePage() {
  return (
    <main className="bg-surface text-primary-text">
      <Hero />
      <CategoryStrip />
      <HomeProductRails />
      <DressEditSwiper />
      <ScoshaEditGrid />
      <AiSizeScanBanner />
      <WhatsTrending />
    </main>
  )
}
