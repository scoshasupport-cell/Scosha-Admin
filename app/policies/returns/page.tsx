import type { Metadata } from "next"
import { CmsPage } from "@/components/site/cms-page"
import Link from "next/link"
import { SCOSHA_CONTACT } from "@/lib/contact"

export const metadata: Metadata = { title: "Returns & Refunds | Scosha" }

export default function ReturnsPage() {
  return (
    <CmsPage title="Returns and Refunds Policy">
      <p className="text-sm text-[#888]">Last updated: 4 October 2026</p>
      <p>Thank you for shopping at Scosha.</p>
      <p>
        Eligible unused items may be returned within <strong>30 days</strong> of delivery, provided they are in original
        condition with tags attached (where applicable) and unused. Some categories may be excluded (for example personal
        care or final-sale items) where stated on the product or at checkout.
      </p>
      <p>
        Before sending anything back, contact us so we can confirm eligibility and give you return instructions:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Email:{" "}
          <a href={SCOSHA_CONTACT.mailto} className="underline hover:text-brand">
            {SCOSHA_CONTACT.email}
          </a>
        </li>
        <li>
          WhatsApp:{" "}
          <a href={SCOSHA_CONTACT.whatsappUrl} className="underline hover:text-brand" target="_blank" rel="noreferrer">
            {SCOSHA_CONTACT.whatsappDisplay}
          </a>
        </li>
        <li>
          Or use our{" "}
          <Link href="/contact" className="underline hover:text-brand">
            contact page
          </Link>
          .
        </li>
      </ul>
      <p>
        If you received a damaged or incorrect item, notify us as soon as possible with your order number and photos so
        we can help.
      </p>
      <p>
        Approved refunds are issued according to how the order was paid. For Cash on Delivery orders, we will agree a
        refund method with you (for example store credit or bank transfer) once the return is received and inspected.
      </p>
      <p>
        See also our{" "}
        <Link href="/policies/terms" className="underline hover:text-brand">
          Terms &amp; Conditions
        </Link>
        .
      </p>
    </CmsPage>
  )
}
