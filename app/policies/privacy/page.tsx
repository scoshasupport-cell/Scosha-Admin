import type { Metadata } from "next"
import Link from "next/link"
import { CmsPage } from "@/components/site/cms-page"
import { SCOSHA_CONTACT } from "@/lib/contact"

export const metadata: Metadata = {
  title: "Privacy Policy | Scosha",
  description:
    "How Scosha collects, uses, and protects your personal data when you browse, create an account, or shop with us.",
}

export default function PrivacyPage() {
  return (
    <CmsPage title="Privacy Policy">
      <p className="text-sm text-[#888]">Last updated: 4 October 2026</p>

      <p>
        This Privacy Policy explains how Scosha (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, shares, and
        protects personal data when you use our website, place an order, create an account, contact customer service, or
        subscribe to our newsletter.
      </p>
      <p>
        Please also read our{" "}
        <Link href="/policies/terms" className="underline hover:text-brand">
          Terms &amp; Conditions
        </Link>
        . By using the site you acknowledge this Policy.
      </p>

      <h2 className="pt-2 text-[18px] font-bold uppercase tracking-wide text-black">At a glance</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Who we are.</strong> Scosha is the controller of your personal data for this store.
        </li>
        <li>
          <strong>What we use data for.</strong> To manage your account, process purchases (including Cash on Delivery),
          deliver orders, answer queries, improve the site, prevent fraud, and — if you opt in — send marketing.
        </li>
        <li>
          <strong>Why we use data.</strong> Mainly to perform our contract with you, for legitimate interests (security,
          service improvement), and where you give consent (e.g. newsletter).
        </li>
        <li>
          <strong>Who we share with.</strong> Service providers who help us operate (hosting, email, couriers, analytics)
          — only as needed to provide the service.
        </li>
        <li>
          <strong>Your rights.</strong> You may request access, correction, deletion, or object to certain processing,
          subject to applicable law.
        </li>
      </ul>

      <h2 className="pt-2 text-[20px] font-bold text-black">1. Who is the controller?</h2>
      <p>
        Scosha is responsible for processing and protecting your personal data in connection with this website and
        online store. Contact:
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

      <h2 className="pt-2 text-[20px] font-bold text-black">2. What data do we process?</h2>
      <p>Depending on how you use Scosha, we may process:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Identity &amp; contact data</strong> — name, email, phone, delivery and billing address, language /
          country preferences.
        </li>
        <li>
          <strong>Account data</strong> — login identifiers, password (stored securely / hashed), order history linked to
          your account.
        </li>
        <li>
          <strong>Transaction data</strong> — products purchased, order totals, COD status, returns, invoices.
        </li>
        <li>
          <strong>Customer service data</strong> — messages you send by email, WhatsApp, or contact forms.
        </li>
        <li>
          <strong>Technical &amp; usage data</strong> — IP address, device/browser type, pages viewed, approximate
          location derived from IP, cookies and similar technologies.
        </li>
        <li>
          <strong>Marketing preferences</strong> — newsletter subscription status and communication choices.
        </li>
      </ul>
      <p>
        Fields marked as required are needed to provide the related service (for example delivery address for an order).
        If you do not provide them, we may be unable to complete registration or checkout.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">3. Why do we use your data?</h2>
      <p>We process personal data for purposes including:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Account registration</strong> — to create and manage your user account and give you access to order
          history and saved details.
        </li>
        <li>
          <strong>Purchases &amp; delivery</strong> — to take and confirm orders, arrange Cash on Delivery, ship
          products, handle exchanges/returns, and issue invoices or order summaries.
        </li>
        <li>
          <strong>Customer service</strong> — to answer questions, resolve issues, and communicate about your order. If
          you contact us via WhatsApp, your number is used to operate that channel (and is also subject to WhatsApp’s
          own privacy terms).
        </li>
        <li>
          <strong>Security &amp; fraud prevention</strong> — to detect unusual activity, protect accounts, and keep the
          platform safe.
        </li>
        <li>
          <strong>Marketing</strong> — if you subscribe to our newsletter or otherwise opt in, to send updates about new
          arrivals and offers. You can unsubscribe at any time via the link in our emails or by contacting us.
        </li>
        <li>
          <strong>Analytics &amp; improvement</strong> — to understand how the site is used, fix issues, and improve
          products and the shopping experience.
        </li>
        <li>
          <strong>Legal compliance</strong> — to meet accounting, tax, or other legal obligations where applicable.
        </li>
      </ul>

      <h2 className="pt-2 text-[20px] font-bold text-black">4. Legal bases</h2>
      <p>Depending on the purpose, we rely on:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Contract</strong> — processing needed to take your order, deliver products, and provide related
          services.
        </li>
        <li>
          <strong>Legitimate interests</strong> — security, fraud prevention, service improvement, and answering general
          enquiries, balanced against your rights.
        </li>
        <li>
          <strong>Consent</strong> — for optional marketing communications and certain cookies/analytics where required.
        </li>
        <li>
          <strong>Legal obligation</strong> — where the law requires us to retain or disclose information.
        </li>
      </ul>

      <h2 className="pt-2 text-[20px] font-bold text-black">5. Who we share data with</h2>
      <p>We do not sell your personal data. We may share data with:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Delivery and logistics partners who bring your order to you.</li>
        <li>Technology providers (hosting, email delivery, cloud storage, analytics) acting on our instructions.</li>
        <li>Professional advisers or authorities when required by law or to protect our rights.</li>
      </ul>
      <p>
        These parties should only process data as needed to provide their services to us and are expected to keep it
        secure.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">6. Cookies &amp; similar technologies</h2>
      <p>
        We use cookies and similar tools for essential site functions (for example keeping items in your bag or session),
        preferences, and — where enabled — analytics or marketing. You can control cookies through your browser
        settings. Blocking some cookies may affect site features.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">7. How long we keep data</h2>
      <p>
        We keep personal data only as long as needed for the purposes above — for example while your account is active,
        for the time needed to complete and support an order, and for periods required by tax or accounting rules. When
        data is no longer needed, we delete or anonymise it where practicable.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">8. Security</h2>
      <p>
        We use appropriate technical and organisational measures to protect personal data against unauthorised access,
        loss, or alteration. No online transmission is completely secure; please use a strong unique password for your
        account.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">9. Your rights</h2>
      <p>Subject to applicable law, you may have the right to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Access the personal data we hold about you.</li>
        <li>Request correction of inaccurate data.</li>
        <li>Request deletion in certain circumstances.</li>
        <li>Object to or restrict certain processing.</li>
        <li>Withdraw consent where processing is based on consent (e.g. newsletter).</li>
        <li>Lodge a complaint with a competent data protection authority where available.</li>
      </ul>
      <p>
        To exercise these rights, email{" "}
        <a href={SCOSHA_CONTACT.mailto} className="underline hover:text-brand">
          {SCOSHA_CONTACT.email}
        </a>{" "}
        or contact us on WhatsApp. We may need to verify your identity before responding.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">10. Children</h2>
      <p>
        Our store is directed at adults. We do not knowingly collect personal data from children under 16 for marketing.
        If you believe a child has provided us data, please contact us so we can delete it.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">11. Changes to this Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at the top will change
        when we do. Continued use of the site after an update means you acknowledge the revised Policy.
      </p>

      <h2 className="pt-2 text-[20px] font-bold text-black">12. Contact</h2>
      <p>
        Questions about privacy? Email{" "}
        <a href={SCOSHA_CONTACT.mailto} className="underline hover:text-brand">
          {SCOSHA_CONTACT.email}
        </a>{" "}
        or WhatsApp{" "}
        <a href={SCOSHA_CONTACT.whatsappUrl} className="underline hover:text-brand" target="_blank" rel="noreferrer">
          {SCOSHA_CONTACT.whatsappDisplay}
        </a>
        .
      </p>
    </CmsPage>
  )
}
