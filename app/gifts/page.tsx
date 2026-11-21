import type { Metadata } from "next"
import Link from "next/link"
import { CmsPage } from "@/components/site/cms-page"

export const metadata: Metadata = { title: "Gifts | Scosha" }

export default function GiftsPage() {
  return (
    <CmsPage
      title="Gifts & Bundles"
      bannerSrc="/banners/hero-desktop-1.jpg"
      bannerMobileSrc="/banners/hero-mobile-1.jpg"
    >
      <p>
        Discover our gift-ready beauty sets, luxury skincare bundles, and limited edition fragrances. Perfect for every special occasion.
      </p>
      <p className="pt-2">
        <Link
          href="/shop?discounted=true"
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-brand px-6 text-[14px] font-bold text-white transition hover:bg-brand-dark"
        >
          Shop Gift Collections
        </Link>
      </p>
    </CmsPage>
  )
}
