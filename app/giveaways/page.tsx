import type { Metadata } from "next"
import Link from "next/link"
import { CmsPage } from "@/components/site/cms-page"

export const metadata: Metadata = { title: "Giveaways | Scosha" }

export default function GiveawaysPage() {
  return (
    <CmsPage
      title="Exclusive Giveaways"
      bannerSrc="/banners/campaign-fragrances-desktop.jpg"
      bannerMobileSrc="/banners/campaign-fragrances-mobile.jpg"
    >
      <p>
        Enter our monthly beauty giveaways for a chance to win curated boxes from top brands including La Roche-Posay, Kérastase, Armani, and more.
      </p>
      <p>
        Follow us on Instagram and TikTok to stay notified about upcoming prize announcements and flash promotions.
      </p>
      <p className="pt-2">
        <Link
          href="/shop"
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-brand px-6 text-[14px] font-bold text-white transition hover:bg-brand-dark"
        >
          Explore Trending Products
        </Link>
      </p>
    </CmsPage>
  )
}
