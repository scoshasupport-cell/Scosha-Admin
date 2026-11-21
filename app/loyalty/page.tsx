import type { Metadata } from "next"
import Link from "next/link"
import { CmsPage } from "@/components/site/cms-page"

export const metadata: Metadata = { title: "My Beauty Program | Scosha" }

export default function LoyaltyPage() {
  return (
    <CmsPage
      title='"My Beauty" Loyalty Program'
      bannerSrc="/banners/hero-desktop-3.png"
      bannerMobileSrc="/banners/hero-mobile-3.png"
    >
      <p>
        Earn points with every purchase: <strong>$1 spent = 1 beauty point earned</strong>.
      </p>
      <p>
        Redeem points for store vouchers, complimentary shipping, and exclusive early access to new product drops throughout the year.
      </p>
      <p className="pt-2">
        <Link
          href="/account"
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-brand px-6 text-[14px] font-bold text-white transition hover:bg-brand-dark"
        >
          Join or Sign In to View Points
        </Link>
      </p>
    </CmsPage>
  )
}
