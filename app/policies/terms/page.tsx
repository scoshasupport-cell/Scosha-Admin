import type { Metadata } from "next"
import Link from "next/link"
import { CmsPage } from "@/components/site/cms-page"
import { SCOSHA_CONTACT } from "@/lib/contact"

export const metadata: Metadata = {
  title: "Terms & Conditions | Scosha",
  description:
    "Purchase conditions for shopping at Scosha — orders, Cash on Delivery, delivery, returns, and use of our website.",
}

export default function TermsPage() {
  return (
    <CmsPage title="Terms & Conditions">
      <p className="text-sm text-[#888]">Last updated: 4 October 2026</p>

      <p>
        These Terms &amp; Conditions (the &ldquo;Terms&rdquo;), together with our{" "}
        <Link href="/policies/privacy" className="underline hover:text-brand">
          Privacy Policy
        </Link>
        , govern your use of the Scosha website and any purchase of products through it. Please read them carefully
        before browsing or placing an order.
      </p>
      <p>
        By using this website or placing an order, you agree to these Terms and our Privacy Policy. If you do not agree,
        please do not use the website. We may update these Terms from time to time; the version in force when you place
        an order applies to that order.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">1. Who we are</h2>
      <p>
        Scosha operates this online store and website. For questions about orders, products, or these Terms, contact us:
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
      </ul>

      <h2 className="pt-2 text-[20px] font-bold text-black">2. Your details &amp; visits to this website</h2>
      <p>
        Personal information you provide is processed as described in our Privacy Policy. By using the site you confirm
        that the details you submit are true and accurate. Keep your account login details confidential; you are
        responsible for activity under your account.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">3. Use of our website</h2>
      <p>When you use this website or place an order, you agree to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Use the site only for legitimate enquiries or orders.</li>
        <li>
          Not place speculative, false, or fraudulent orders. We may cancel such orders and, where appropriate, notify
          the relevant authorities.
        </li>
        <li>Provide correct email, phone, postal, and delivery details so we can contact you about your order.</li>
      </ul>
      <p>
        By placing an order you confirm that you are at least 18 years old (or the age of legal capacity in your
        country) and able to enter into a binding contract.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">4. How the contract is formed</h2>
      <p>
        Product listings on this website are an invitation to order, not a binding offer. Your order is an offer to buy.
        After you submit an order you will normally receive an order confirmation by email or message. That confirmation
        acknowledges receipt of your order; the purchase contract is formed when we accept the order and confirm that
        the item(s) will be prepared for delivery / dispatch.
      </p>
      <p>
        We may refuse or cancel an order (for example due to stock, pricing errors, incomplete details, or suspected
        fraud). If we cancel after you have paid, we will refund any amount already collected for that order.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">5. Availability of products</h2>
      <p>
        All orders are subject to availability. If an item is out of stock or supply is delayed, we may offer a suitable
        alternative or cancel that part of the order and refund any amount paid for the unavailable item.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">6. Pricing</h2>
      <p>
        Prices are shown on the product pages and at checkout. We try to keep prices accurate, but errors can occur. If
        we discover a clear pricing error on your order, we will contact you and give you the option to confirm at the
        correct price or cancel. We are not obliged to supply items at an obviously incorrect price.
      </p>
      <p>
        Prices may change at any time, but changes will not affect orders we have already accepted, except where a
        correction of an obvious error is required.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">7. Payment — Cash on Delivery (COD)</h2>
      <p>
        Unless we state otherwise at checkout, orders on Scosha are paid by <strong>Cash on Delivery (COD)</strong>.
        You agree to pay the order total in cash to the courier or delivery agent when you receive the goods.
      </p>
      <p>
        You must be available at the delivery address (or arrange a trusted recipient) to accept the parcel and complete
        payment. Repeated failed deliveries or refusal to pay on delivery may lead to cancellation of the order and
        restrictions on future COD orders.
      </p>
      <p>
        If other payment methods are enabled in the future, the methods shown at checkout will apply to that order.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">8. Delivery</h2>
      <p>
        Delivery times shown on the site or in confirmation messages are estimates. We will endeavour to deliver within
        a reasonable period after order acceptance. Delays may occur due to stock, courier networks, weather, or events
        outside our control.
      </p>
      <p>
        Free delivery may apply when your order meets the threshold shown on the site (free standard
        delivery on orders of <strong>$150</strong> and above). You are responsible for providing a complete and accurate delivery address.
      </p>
      <p>
        Risk in the products passes to you on delivery (when you or your nominated recipient take physical possession).
        Ownership passes when we receive full payment for the order (including any delivery charges).
      </p>
      <p>
        If a parcel cannot be delivered for reasons not attributable to us and remains uncollected after a reasonable
        period, we may treat the order as cancelled and apply our returns / restocking practices for that case.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">9. Returns &amp; exchanges</h2>
      <p>
        Eligible unused items may be returned within <strong>30 days</strong> of delivery, provided they are in original
        condition with tags and packaging where applicable, and subject to our{" "}
        <Link href="/policies/returns" className="underline hover:text-brand">
          Returns &amp; Refunds Policy
        </Link>
        .
      </p>
      <p>
        Please contact us before returning any item so we can confirm eligibility and the process for your order. Some
        products (for example personal care, underwear, or final-sale items) may be excluded where stated.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">10. Product information</h2>
      <p>
        We aim to describe products accurately (including colours and materials). Images are for illustration; slight
        differences may occur due to screen settings or manufacturing batches. Size guides are indicative — if you need
        help choosing a size, contact us on WhatsApp or email.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">11. Intellectual property</h2>
      <p>
        All content on this website (text, images, logos, design, and software) is owned by Scosha or its licensors. You
        may not copy, reproduce, or use it for commercial purposes without our prior written consent.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">12. Liability</h2>
      <p>
        Nothing in these Terms limits rights you have under mandatory consumer law in your country. To the fullest extent
        permitted by law, Scosha is not liable for indirect or consequential losses arising from use of the site or from
        delayed delivery, except where caused by our fraud or wilful misconduct.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">13. Events beyond our control</h2>
      <p>
        We are not liable for failure or delay in performing our obligations where caused by events outside our
        reasonable control (including courier disruption, strikes, natural events, or network outages). We will take
        reasonable steps to minimise the impact and keep you informed where possible.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">14. Contact</h2>
      <p>
        For questions about these Terms, email{" "}
        <a href={SCOSHA_CONTACT.mailto} className="underline hover:text-brand">
          {SCOSHA_CONTACT.email}
        </a>{" "}
        or message us on WhatsApp at{" "}
        <a href={SCOSHA_CONTACT.whatsappUrl} className="underline hover:text-brand" target="_blank" rel="noreferrer">
          {SCOSHA_CONTACT.whatsappDisplay}
        </a>
        .
      </p>
      <p>
        See also our{" "}
        <Link href="/policies/privacy" className="underline hover:text-brand">
          Privacy Policy
        </Link>
        ,{" "}
        <Link href="/policies/shipping" className="underline hover:text-brand">
          Shipping
        </Link>
        , and{" "}
        <Link href="/policies/returns" className="underline hover:text-brand">
          Returns
        </Link>{" "}
        pages.
      </p>
    </CmsPage>
  )
}
