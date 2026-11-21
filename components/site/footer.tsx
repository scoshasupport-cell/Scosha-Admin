"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Truck, ShieldCheck, Package, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { SCOSHA_CONTACT } from "@/lib/contact"
import { api, ApiError } from "@/lib/api"
import { CATEGORY_ROUTES } from "@/lib/category-routes"

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.1875 13.5223V21H13.2656V13.5223H16.3066L16.9395 10.084H13.2656V8.86758C13.2656 7.05 13.9793 6.35391 15.8215 6.35391C16.3945 6.35391 16.8551 6.36797 17.1223 6.39609V3.27773C16.6195 3.14062 15.3891 3 14.6789 3C10.9207 3 9.1875 4.77539 9.1875 8.60391V10.084H6.86719V13.5223H9.1875Z" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function TiktokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.8a4.3 4.3 0 0 1-3.1-1.3v9.4a5.1 5.1 0 1 1-4.4-5v2.2a2.9 2.9 0 1 0 2.1 2.8V2h2.3a4.3 4.3 0 0 0 3.1 3.6v2.2Z" />
    </svg>
  )
}
function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

const SOCIALS = [
  { label: "Instagram", href: SCOSHA_CONTACT.instagram, Icon: InstagramIcon },
  { label: "Facebook", href: SCOSHA_CONTACT.facebook, Icon: FacebookIcon },
  { label: "TikTok", href: SCOSHA_CONTACT.instagram, Icon: TiktokIcon },
] as const

const SHOP = [
  CATEGORY_ROUTES.women,
  CATEGORY_ROUTES.men,
  CATEGORY_ROUTES.kids,
  CATEGORY_ROUTES.shoes,
  CATEGORY_ROUTES.beauty,
  CATEGORY_ROUTES.accessories,
  CATEGORY_ROUTES.tech,
  CATEGORY_ROUTES.home,
] as const

const HELP = [
  { label: "Track Order", href: "/account" },
  { label: "Shipping", href: "/policies/shipping" },
  { label: "Returns & Exchanges", href: "/policies/returns" },
  { label: "Size Guide", href: "/shop?category=clothes" },
  { label: "FAQ", href: "/contact" },
] as const

const ABOUT = [
  { label: "Terms & Conditions", href: "/policies/terms" },
  { label: "Privacy Policy", href: "/policies/privacy" },
] as const

const BENEFITS = [
  { icon: Truck, label: "Free Delivery Above $150" },
  { icon: ShieldCheck, label: "100% Authentic Products" },
  { icon: Package, label: "30-Day Returns" },
] as const

function CodMark({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-[#1A1A1A]/22 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A1A1A]"
      }
      aria-label="Cash on Delivery"
      title="Cash on Delivery"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#7A1F2B] text-[8px] font-black tracking-normal text-white">
        COD
      </span>
      Cash On Delivery
    </span>
  )
}

function PaymentMarks() {
  return (
    <div className="flex flex-wrap items-center gap-3.5 text-[#1A1A1A]" aria-label="Accepted payments">
      <CodMark />
    </div>
  )
}

function PrivateAccessForm() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    isVip: boolean
    canLogin: boolean
    message: string
    qualifyHint?: string | null
  } | null>(null)

  const VIP_HOW_TO =
    "Become a Scosha VIP by completing one order of $300 or more. VIP members receive 10% off their next order, 5 free deliveries, and early Private Access to exclusive collections."

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) {
      toast.message("Enter your VIP email to check Private Access.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.message("Please enter a valid email address.")
      return
    }

    setBusy(true)
    setResult(null)
    try {
      // Soft newsletter opt-in — never block VIP check or show subscribe errors
      void api.post("/newsletter/subscribe", { email: value }, { skipAuth: true }).catch(() => {})

      const res = await api.post<{
        isVip: boolean
        canLogin: boolean
        message: string
        qualifyHint?: string | null
      }>("/vip/check", { email: value }, { skipAuth: true })

      setResult(res.data)

      if (res.data.isVip) {
        toast.success(res.data.message || "VIP confirmed — log in for Private Access.")
      } else {
        toast.message(res.data.message || "Not a VIP member yet", {
          description: res.data.qualifyHint || VIP_HOW_TO,
          duration: 6500,
        })
      }
    } catch (err) {
      const apiMessage = err instanceof ApiError ? err.message : null
      const isValidation =
        apiMessage && /email|valid|required/i.test(apiMessage) && !/vip|member|spend|order/i.test(apiMessage)

      if (isValidation) {
        toast.message(apiMessage)
      } else {
        setResult({
          isVip: false,
          canLogin: false,
          message: "We couldn’t verify VIP status for that email right now.",
          qualifyHint: VIP_HOW_TO,
        })
        toast.message("VIP membership terms", {
          description: VIP_HOW_TO,
          duration: 7000,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3.5 w-full max-w-[400px]">
      <form onSubmit={onSubmit} className="relative">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (result) setResult(null)
          }}
          placeholder="VIP email address"
          className="h-[44px] w-full rounded-full border border-[#E4DDD4] bg-white pr-12 pl-5 text-[13px] text-[#1A1A1A] outline-none placeholder:text-[#A8A199] focus:border-[#7A1F2B]"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Check VIP access"
          className="absolute right-[3px] top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-[#7A1F2B] text-white transition hover:bg-[#5C1520] disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} strokeWidth={2.2} />}
        </button>
      </form>
      {result && (
        <div
          className={`mt-3 rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed ${
            result.isVip
              ? "border-[#7A1F2B]/25 bg-[#7A1F2B]/5 text-[#5C1520]"
              : "border-[#E4DDD4] bg-white text-[#5C574F]"
          }`}
        >
          <p className="font-medium text-[#1A1A1A]">{result.message}</p>
          {!result.isVip && (
            <p className="mt-1.5 text-[11px] text-[#8A837A]">{result.qualifyHint || VIP_HOW_TO}</p>
          )}
          {(result.isVip || result.canLogin) && (
            <Link
              href={
                result.isVip
                  ? "/account"
                  : `/account?mode=login&email=${encodeURIComponent(email.trim())}`
              }
              className="mt-2 inline-flex text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A1F2B] underline underline-offset-4"
            >
              {result.isVip ? "Log in to VIP account" : "Log in to your account"}
            </Link>
          )}
          {!result.isVip && (
            <Link
              href="/shop"
              className="mt-2 ml-0 inline-flex text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A1F2B] underline underline-offset-4 sm:ml-3"
            >
              Shop to unlock VIP
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function Footer() {
  return (
    <footer id="site-footer" className="bg-[#F9F5F0] text-[#1A1A1A]">
      {/*
        AFTER layout: content left + lifestyle photo right column
        (photo spans brand row + link columns; stops above bottom bar)
      */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(200px,34%)] lg:items-stretch">
        {/* LEFT — brand, newsletter, links */}
        <div className="store-container lg:max-w-none lg:pr-8 lg:pl-[max(3.125rem,env(safe-area-inset-left))] xl:pr-10">
          {/* Top: SCOSHA + Private Access */}
          <div className="grid items-start gap-10 pt-12 pb-10 sm:pt-14 sm:pb-11 lg:grid-cols-[1fr_minmax(240px,360px)] lg:gap-10 lg:pt-14 lg:pb-11">
            <div>
              <Link
                href="/"
                aria-label="Scosha Home"
                className="inline-block font-serif text-[2rem] font-semibold leading-none tracking-[0.04em] text-[#7A1F2B] transition hover:opacity-85 sm:text-[48px] lg:text-[52px]"
              >
                SCOSHA
              </Link>
              <p className="mt-2.5 text-[10px] font-medium uppercase tracking-[0.3em] text-[#1A1A1A] sm:text-[11px]">
                Curated for Modern Living.
              </p>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1A1A1A]">
                Private Access
              </h3>
              <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-[#5C574F]">
                Reserved for Scosha VIP members — early access to exclusive drops and curated edits.
              </p>
              <ul className="mt-3 max-w-[340px] space-y-1.5 text-[12px] leading-relaxed text-[#8A837A]">
                <li>
                  <span className="font-medium text-[#5C574F]">Become VIP:</span> spend $300+ in a
                  single order.
                </li>
                <li>
                  <span className="font-medium text-[#5C574F]">VIP benefits:</span> 10% off your next
                  order, 5 free deliveries, and early Private Access.
                </li>
              </ul>
              <p className="mt-3 max-w-[340px] text-[12px] text-[#8A837A]">
                Already a VIP? Enter your email to confirm access.
              </p>
              <PrivateAccessForm />
            </div>
          </div>

          {/* Divider — matches AFTER mock */}
          <div className="border-t border-[#E6DFD6]" />

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-8 sm:gap-x-8 sm:gap-y-10 sm:py-10 md:grid-cols-4 md:gap-x-8 lg:py-11">
            <div>
              <h4 className="mb-3.5 text-[14px] font-bold text-[#1A1A1A]">Shop</h4>
              <ul className="space-y-2.5 text-[13px] text-[#5C574F]">
                {SHOP.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="transition hover:text-[#7A1F2B]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3.5 text-[14px] font-bold text-[#1A1A1A]">Help</h4>
              <ul className="space-y-2.5 text-[13px] text-[#5C574F]">
                {HELP.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="transition hover:text-[#7A1F2B]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3.5 text-[14px] font-bold text-[#1A1A1A]">About</h4>
              <ul className="space-y-2.5 text-[13px] text-[#5C574F]">
                {ABOUT.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="transition hover:text-[#7A1F2B]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3.5 text-[14px] font-bold text-[#1A1A1A]">Follow Us</h4>
              <div className="flex flex-col items-start gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {SOCIALS.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1A1A1A]/22 bg-white text-[#1A1A1A] transition hover:border-[#7A1F2B] hover:text-[#7A1F2B] sm:h-9 sm:w-9"
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[15px] font-black tracking-tight text-[#1A1A1A]">Contact Us</span>
                  <a
                    href={SCOSHA_CONTACT.mailto}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#5C574F] transition hover:text-[#7A1F2B]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1A1A1A]/22 bg-white text-[#1A1A1A] transition hover:border-[#7A1F2B] hover:text-[#7A1F2B]">
                      <EmailIcon />
                    </span>
                    Email us
                  </a>
                  <a
                    href={SCOSHA_CONTACT.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${SCOSHA_CONTACT.whatsappDisplay}`}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#5C574F] transition hover:text-[#7A1F2B]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1A1A1A]/22 bg-white text-[#1A1A1A] transition hover:border-[#7A1F2B] hover:text-[#7A1F2B]">
                      <WhatsAppIcon />
                    </span>
                    Whatsapp us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — lifestyle photo (desktop), full height of main block */}
        <div className="relative hidden min-h-[420px] overflow-hidden lg:block" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/footer-rightside.jpeg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[58%_45%]"
          />
          {/* Soft blend into cream on the left edge */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-14 xl:w-[4.5rem]"
            style={{
              background:
                "linear-gradient(90deg, #F9F5F0 0%, rgba(249,245,240,0.55) 40%, transparent 100%)",
            }}
          />
        </div>
      </div>

      {/* Bottom utility bar */}
      <div className="border-t border-[#E6DFD6] bg-[#F9F5F0]">
        <div className="store-container flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:py-[17px]">
          <p className="shrink-0 text-[12px] text-[#6B6560]">
            &copy; {new Date().getFullYear()} SCOSHA. All rights reserved.
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-2">
            {BENEFITS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[#3A3530]">
                <Icon size={14} strokeWidth={1.6} className="shrink-0" />
                <span className="text-[12px] font-medium leading-snug">{label}</span>
              </div>
            ))}
          </div>

          <PaymentMarks />
        </div>
      </div>
    </footer>
  )
}
