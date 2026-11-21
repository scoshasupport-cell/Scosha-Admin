"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Gift, Package, Sparkles, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { requestGoogleAccessToken } from "@/lib/google-sign-in"
import { SignInMethods } from "@/components/auth/sign-in-methods"
import { PhoneField } from "@/components/auth/phone-field"
import { useModalFocus } from "@/hooks/useModalFocus"
import {
  VIP_FREE_DELIVERY_ORDERS,
  VIP_NEXT_ORDER_DISCOUNT_PERCENT,
  VIP_ORDER_THRESHOLD,
} from "@/lib/commerce"

const STORAGE_KEY = "scosha_welcome_register_dismissed"
const SHOW_DELAY_MS = 1400

const SKIP_PATHS = [
  "/account",
  "/verify-email",
  "/checkout",
  "/forgot-password",
  "/reset-password",
  "/order-confirmation",
]

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "0", "2", "4", "6", "8", "10", "12"]

const inputClass =
  "h-11 w-full rounded-full bg-[#ededed] px-4 text-[14px] outline-none placeholder:text-[#888]"

type Gender = "women" | "men" | "unisex" | ""

export function WelcomeRegisterModal() {
  const pathname = usePathname()
  const router = useRouter()
  const { register, loginWithGoogle, isAuthenticated, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [entry, setEntry] = useState<"choose" | "email" | "phone">("choose")
  const [busy, setBusy] = useState(false)
  const [gender, setGender] = useState<Gender>("")
  const [preferredSize, setPreferredSize] = useState("")

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  })

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
      sessionStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setOpen(false)
  }, [])
  const dialogRef = useModalFocus(open, dismiss)
  /** Only auto-open once — re-scheduling on every route change traps mobile taps. */
  const scheduledRef = useRef(false)

  useEffect(() => {
    if (loading || isAuthenticated) {
      setOpen(false)
      return
    }
    if (SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpen(false)
      return
    }
    try {
      if (
        localStorage.getItem(STORAGE_KEY) === "1" ||
        sessionStorage.getItem(STORAGE_KEY) === "1"
      ) {
        return
      }
    } catch {
      /* ignore */
    }
    if (scheduledRef.current) return
    scheduledRef.current = true

    const t = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [loading, isAuthenticated, pathname])

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function goNext(e: FormEvent) {
    e.preventDefault()
    const missingEmail = entry !== "phone" && !form.email.trim()
    const missingPhone = entry === "phone" && !form.phone.trim()
    if (!form.name.trim() || missingEmail || missingPhone || form.password.length < 8) {
      toast.error(
        entry === "phone"
          ? "Please fill in your name, phone number, and a password (8+ characters)."
          : "Please fill in your name, email, and a password (8+ characters).",
      )
      return
    }
    setStep(2)
  }

  async function onGoogle() {
    setBusy(true)
    try {
      await requestGoogleAccessToken().then((token) => loginWithGoogle(token))
      try {
        localStorage.setItem(STORAGE_KEY, "1")
      } catch {
        /* ignore */
      }
      toast.success("Welcome")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed")
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const hasAddress = Boolean(form.line1.trim() && form.city.trim() && form.state.trim() && form.zip.trim())
      const res = await register({
        name: form.name.trim(),
        password: form.password,
        ...(entry === "phone"
          ? { phone: form.phone.trim() }
          : { email: form.email.trim(), phone: form.phone.trim() || undefined }),
        gender: gender || undefined,
        preferredSize: preferredSize || undefined,
        address: hasAddress
          ? {
              line1: form.line1.trim(),
              line2: form.line2.trim() || undefined,
              city: form.city.trim(),
              state: form.state.trim(),
              zip: form.zip.trim(),
              country: form.country.trim() || "US",
            }
          : undefined,
      })
      try {
        localStorage.setItem(STORAGE_KEY, "1")
      } catch {
        /* ignore */
      }
      toast.success(res.message || (res.user ? "Account created" : "Check your email for the verification code"))
      if (res.devOtp) toast.message(`Dev OTP: ${res.devOtp}`)
      setOpen(false)
      if (!res.user && form.email.trim()) {
        router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}`)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed")
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[85] flex items-end justify-center p-0 outline-none sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-primary-text/50 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-register-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div
          className="relative shrink-0 px-5 pb-4 pt-6 text-white sm:px-6"
          style={{ background: "linear-gradient(145deg, #7A1F2B 0%, #5C1520 100%)" }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Maybe later"
          >
            <X size={18} />
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Welcome to SCOSHA</p>
          <h2 id="welcome-register-title" className="mt-1.5 font-serif text-2xl font-bold leading-snug">
            Create your account
          </h2>
          <p className="mt-1.5 text-sm text-white/85">
            Unlock faster checkout, personalized picks, and member benefits.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {step === 1 && entry === "choose" ? (
                <SignInMethods
                  busy={busy}
                  onGoogle={() => void onGoogle()}
                  onEmail={() => setEntry("email")}
                  onPhone={() => setEntry("phone")}
                />
              ) : step === 1 ? (
            <>
              <button
                type="button"
                onClick={() => setEntry("choose")}
                className="mb-4 text-[13px] font-semibold underline"
              >
                All sign-in options
              </button>
              <ul className="mb-5 grid gap-2.5 text-sm text-subtext">
                <li className="flex items-start gap-2.5">
                  <Truck className="mt-0.5 shrink-0 text-brand" size={16} />
                  <span>Saved address &amp; phone for faster checkout</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 shrink-0 text-brand" size={16} />
                  <span>Size &amp; style preferences for better recommendations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Package className="mt-0.5 shrink-0 text-brand" size={16} />
                  <span>Order tracking, wishlist, and account history</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Gift className="mt-0.5 shrink-0 text-brand" size={16} />
                  <span>
                    VIP path: spend ${VIP_ORDER_THRESHOLD}+ in one order for{" "}
                    {VIP_NEXT_ORDER_DISCOUNT_PERCENT}% off + {VIP_FREE_DELIVERY_ORDERS} free deliveries
                  </span>
                </li>
              </ul>

              <form className="space-y-3" onSubmit={goNext}>
                <input
                  className={inputClass}
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  autoComplete="name"
                />
                {entry === "phone" ? (
                  <PhoneField
                    value={form.phone}
                    onChange={(v) => updateField("phone", v)}
                    required
                    variant="pill"
                    name="welcome-phone"
                  />
                ) : (
                  <input
                    className={inputClass}
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                    autoComplete="email"
                  />
                )}
                <input
                  className={inputClass}
                  placeholder="Password (8+ characters)"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  className="mt-1 h-11 w-full rounded-[10px] bg-brand text-[13px] font-semibold uppercase tracking-wider text-white hover:bg-brand-dark"
                >
                  Continue
                </button>
              </form>
            </>
          ) : (
            <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Preferences</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["women", "Women"],
                    ["men", "Men"],
                    ["unisex", "Prefer not to say"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wider ${
                      gender === value
                        ? "bg-brand text-white"
                        : "bg-[#ededed] text-primary-text hover:bg-[#e0e0e0]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Preferred size
                </label>
                <select
                  className={`${inputClass} appearance-none`}
                  value={preferredSize}
                  onChange={(e) => setPreferredSize(e.target.value)}
                >
                  <option value="">Select size (optional)</option>
                  {SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Shipping address <span className="font-normal normal-case tracking-normal">(optional)</span>
              </p>
              <input
                className={inputClass}
                placeholder="Street address"
                value={form.line1}
                onChange={(e) => updateField("line1", e.target.value)}
                autoComplete="address-line1"
              />
              <input
                className={inputClass}
                placeholder="Apt, suite (optional)"
                value={form.line2}
                onChange={(e) => updateField("line2", e.target.value)}
                autoComplete="address-line2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  autoComplete="address-level2"
                />
                <input
                  className={inputClass}
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  autoComplete="address-level1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  placeholder="ZIP"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  autoComplete="postal-code"
                />
                <input
                  className={inputClass}
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  autoComplete="country-name"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 flex-1 rounded-[10px] border border-border-subtle text-[13px] font-semibold uppercase tracking-wider text-primary-text hover:bg-surface"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 flex-[1.4] rounded-[10px] bg-brand text-[13px] font-semibold uppercase tracking-wider text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full text-center text-[13px] text-muted underline-offset-2 hover:underline"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
