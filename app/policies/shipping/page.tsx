import type { Metadata } from "next"
import { CmsPage } from "@/components/site/cms-page"

export const metadata: Metadata = { title: "Shipping policy | Scosha" }

export default function ShippingPage() {
  return (
    <CmsPage title="Shipping policy">
      <p>We aim to deliver your orders quickly and reliably.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Express Delivery Available – Choose express shipping at checkout for faster delivery.</li>
        <li>Free standard delivery on orders of $150 and above — automatically applied at checkout.</li>
        <li>Standard Delivery – 3–5 business days.</li>
      </ul>
      <p>Processing times may vary during peak seasons or promotional periods. Once shipped, you will receive a tracking number via email.</p>
    </CmsPage>
  )
}
