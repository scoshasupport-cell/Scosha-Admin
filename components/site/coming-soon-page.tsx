"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Bell, CheckCircle2, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

type ComingSoonProps = {
  title: string
  eyebrow: string
  description: string
  features: { icon: LucideIcon; title: string; body: string }[]
  waitlistLabel?: string
  shopHref?: string
  shopLabel?: string
}

export function ComingSoonPage({
  title,
  eyebrow,
  description,
  features,
  waitlistLabel = "Notify Me",
  shopHref = "/shop?category=clothes",
  shopLabel = "Shop Clothes & Winter collection",
}: ComingSoonProps) {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      await api.post("/newsletter/subscribe", { email: email.trim() }, { skipAuth: true })
      setSubmitted(true)
      setEmail("")
    } catch {
      toast.error("Could not join the waitlist. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[70vh] bg-surface">
      <section className="relative overflow-hidden border-b border-border-subtle bg-white py-16 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 20% 0%, #F5F3FF, transparent), radial-gradient(ellipse 50% 40% at 90% 100%, #ECFEFF, transparent)",
          }}
        />
        <div className="store-container relative mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-brand-light px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            {eyebrow}
          </p>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-primary-text sm:text-5xl lg:text-6xl">
            {title}{" "}
            <span className="text-[var(--color-sale)]">Coming Soon</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-subtext sm:text-base">
            {description}
          </p>

          <div className="mx-auto mt-10 max-w-md">
            {submitted ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand/20 bg-brand-light p-4 text-sm font-medium text-brand">
                <CheckCircle2 size={18} />
                <span>You&apos;re on the waitlist — we&apos;ll email you at launch.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email for early access"
                  className="h-12 flex-1 rounded-xl border border-border-subtle bg-surface px-4 text-sm text-primary-text outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                  style={{ background: "#7A1F2B" }}
                >
                  <Bell size={16} />
                  {busy ? "Saving…" : waitlistLabel}
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={shopHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-text underline-offset-4 hover:text-brand hover:underline"
            >
              {shopLabel}
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/shop?category=furniture"
              className="inline-flex items-center gap-2 text-sm font-semibold text-subtext underline-offset-4 hover:text-brand hover:underline"
            >
              Shop Home &amp; Curtains
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="store-container mx-auto max-w-5xl">
          <h2 className="text-center font-serif text-2xl font-bold text-primary-text sm:text-3xl">
            What&apos;s coming
          </h2>
          <p className="mt-2 text-center text-sm text-subtext">
            Join the list — launch drops go to waitlist members first.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {features.map(({ icon: Icon, title: featureTitle, body }) => (
              <div
                key={featureTitle}
                className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm"
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ background: "#7A1F2B" }}
                >
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-bold text-primary-text">{featureTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-subtext">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
