import type { Metadata } from "next"
import { CmsPage } from "@/components/site/cms-page"

export const metadata: Metadata = { title: "About Us | Scosha" }

export default function AboutPage() {
  return (
    <CmsPage
      title="About Us"
      bannerSrc="/banners/hero-desktop-5.jpg"
      bannerMobileSrc="/banners/hero-mobile-5.jpg"
    >
      <p>
        Scosha is an online premium beauty retailer offering authentic makeup, skincare and haircare products from the most
        prestigious brands worldwide, in addition to selected fashion collections.
      </p>
      <p>
        We collaborate closely with leading influencers in our markets, enabling them to list their favorite products and to
        create localized content for both our followers and the brands.
      </p>
      <p>Scosha is part of a group of companies focused on digital content creation and e-commerce in beauty and health.</p>
    </CmsPage>
  )
}
