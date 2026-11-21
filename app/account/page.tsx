"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { consumeWishlistRedirect } from "@/lib/pending-wishlist"
import { requestGoogleAccessToken } from "@/lib/google-sign-in"
import { SignInMethods } from "@/components/auth/sign-in-methods"
import { PhoneField } from "@/components/auth/phone-field"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { useAddresses, useAddressMutations } from "@/hooks/useAddresses"
import { Suspense } from "react"

function AccountInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/account"
  const { user, loading, login, loginWithGoogle, register, logout, isAuthenticated } = useAuth()
  const addresses = useAddresses(isAuthenticated)
  const addressMutations = useAddressMutations()
  const [loginBusy, setLoginBusy] = useState(false)
  const [regBusy, setRegBusy] = useState(false)
  const [addrBusy, setAddrBusy] = useState(false)
  const [tab, setTab] = useState<"details" | "addresses">("details")
  const [authView, setAuthView] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login",
  )
  const [method, setMethod] = useState<"choose" | "email" | "phone">("choose")
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState("")
  const savingItem = Boolean(searchParams.get("save"))

  function isUnverifiedError(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false
    if (err.status === 403 && /verif/i.test(err.message)) return true
    const data = err.data as { errors?: Array<{ code?: string }> } | null
    return Boolean(data?.errors?.some((e) => e.code === "EMAIL_UNVERIFIED"))
  }

  const sortedAddresses = useMemo(() => {
    const list = addresses.data ?? []
    return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
  }, [addresses.data])

  async function finishAuth() {
    const savedNext = consumeWishlistRedirect()
    toast.success(savedNext ? "Saved to your wishlist" : "Welcome")
    router.push(savedNext || redirectTo)
  }

  async function onGoogle() {
    setLoginBusy(true)
    try {
      await requestGoogleAccessToken().then((token) => loginWithGoogle(token))
      await finishAuth()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed")
    } finally {
      setLoginBusy(false)
    }
  }

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get("email") || "").trim()
    const phone = phoneValue.trim() || String(fd.get("phone") || "").trim()
    const password = String(fd.get("password") || "")
    setLoginBusy(true)
    setUnverifiedEmail(null)
    try {
      await login(method === "phone" ? { phone, password } : { email, password })
      await finishAuth()
    } catch (err) {
      if (method === "email" && isUnverifiedError(err)) {
        setUnverifiedEmail(email)
        toast.error("Email verification required", {
          action: {
            label: "Verify email",
            onClick: () => {
              router.push(`/verify-email?email=${encodeURIComponent(email)}`)
            },
          },
        })
        return
      }
      toast.error(err instanceof ApiError ? err.message : "Login failed")
    } finally {
      setLoginBusy(false)
    }
  }

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") || "")
    const email = String(fd.get("email") || "")
    const phone = phoneValue.trim() || String(fd.get("phone") || "").trim()
    const password = String(fd.get("password") || "")
    setRegBusy(true)
    try {
      const res = await register({
        name,
        password,
        ...(method === "phone" ? { phone } : { email, phone: phone || undefined }),
      })
      if (res.user) {
        await finishAuth()
        return
      }
      toast.success(res.message || "Check your email for the OTP")
      if (res.devOtp) toast.message(`Dev OTP: ${res.devOtp}`)
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed")
    } finally {
      setRegBusy(false)
    }
  }

  async function onAddAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setAddrBusy(true)
    try {
      await addressMutations.create.mutateAsync({
        name: String(fd.get("name") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || user?.email || ""),
        line1: String(fd.get("line1") || ""),
        line2: String(fd.get("line2") || "") || undefined,
        city: String(fd.get("city") || ""),
        state: String(fd.get("state") || ""),
        zip: String(fd.get("zip") || ""),
        country: String(fd.get("country") || "US"),
        isDefault: fd.get("isDefault") === "on",
      })
      toast.success("Address saved")
      e.currentTarget.reset()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save address")
    } finally {
      setAddrBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="store-container space-y-5 py-10 md:py-16">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="mx-auto max-w-md space-y-3 pt-4">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-[10px]" />
        </div>
      </main>
    )
  }

  if (isAuthenticated && user) {
    return (
      <main className="store-container py-10 md:py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-bold">My Account</h1>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-border-subtle px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              Sign out
            </button>
          </div>

          {Boolean(user.email) && !user.isEmailVerified && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm">
              Email not verified.{" "}
              <Link
                href={`/verify-email?email=${encodeURIComponent(user.email)}`}
                className="font-semibold underline"
              >
                Verify now
              </Link>
            </div>
          )}

          <div className="flex gap-2 border-b border-border-subtle pb-2">
            <button
              type="button"
              onClick={() => setTab("details")}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                tab === "details" ? "bg-brand text-white" : "bg-surface-2 text-subtext"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setTab("addresses")}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                tab === "addresses" ? "bg-brand text-white" : "bg-surface-2 text-subtext"
              }`}
            >
              Addresses
            </button>
          </div>

          {tab === "details" && (
            <div className="space-y-4">
              {user.isVip ? (
                <div
                  className="rounded-2xl border border-[#7A1F2B]/25 px-5 py-4 text-white"
                  style={{ background: "linear-gradient(135deg, #7A1F2B 0%, #5C1520 100%)" }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    Membership
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold">VIP Member</p>
                  <p className="mt-2 text-sm text-white/85">
                    {(user.vipPendingDiscountPercent || 0) > 0
                      ? `${user.vipPendingDiscountPercent}% off ready for your next order · `
                      : ""}
                    {user.freeDeliveryCredits || 0} free delivery credit
                    {(user.freeDeliveryCredits || 0) === 1 ? "" : "s"} remaining
                    {user.vipEarlyAccess !== false ? " · Early access enabled" : ""}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 text-sm text-subtext">
                  Spend <strong className="text-primary-text">$300+</strong> in one order to unlock
                  VIP — 10% off your next order, 5 free deliveries, and early access.
                </div>
              )}
              <div className="rounded-2xl border border-border-subtle bg-white p-6 space-y-2 text-sm">
                <p>
                  <span className="text-muted">Name</span>
                  <br />
                  <strong>{user.name}</strong>
                </p>
                <p>
                  <span className="text-muted">Email</span>
                  <br />
                  <strong>{user.email}</strong>
                </p>
                {user.phone && (
                  <p>
                    <span className="text-muted">Phone</span>
                    <br />
                    <strong>{user.phone}</strong>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/orders" className="btn-primary px-6 py-3 text-xs">
                  Orders
                </Link>
                <Link href="/wishlist" className="btn-secondary px-6 py-3 text-xs">
                  Wishlist
                </Link>
                <Link href="/checkout" className="btn-secondary px-6 py-3 text-xs">
                  Checkout
                </Link>
              </div>
            </div>
          )}

          {tab === "addresses" && (
            <div className="space-y-6">
              {addresses.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : sortedAddresses.length === 0 ? (
                <p className="text-sm text-muted">No saved addresses yet.</p>
              ) : (
                <ul className="space-y-3">
                  {sortedAddresses.map((addr) => (
                    <li
                      key={addr.id}
                      className="rounded-2xl border border-border-subtle bg-white p-5 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {addr.name}{" "}
                            {addr.isDefault && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-brand">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-subtext">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                            <br />
                            {addr.city}, {addr.state} {addr.zip}
                            <br />
                            {addr.country} · {addr.phone}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              className="rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase"
                              onClick={() =>
                                void addressMutations.setDefault
                                  .mutateAsync(addr.id)
                                  .then(() => toast.success("Default updated"))
                                  .catch((err) =>
                                    toast.error(
                                      err instanceof Error ? err.message : "Failed",
                                    ),
                                  )
                              }
                            >
                              Set default
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold uppercase text-red-600"
                            onClick={() =>
                              void addressMutations.remove
                                .mutateAsync(addr.id)
                                .then(() => toast.success("Address removed"))
                                .catch((err) =>
                                  toast.error(err instanceof Error ? err.message : "Failed"),
                                )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form
                onSubmit={onAddAddress}
                className="grid gap-3 rounded-2xl border border-border-subtle bg-white p-5 sm:grid-cols-2"
              >
                <h2 className="sm:col-span-2 text-base font-bold">Add address</h2>
                <input name="name" required placeholder="Full name" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none" />
                <input name="phone" required placeholder="Phone" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none" />
                <input name="email" type="email" defaultValue={user.email} placeholder="Email" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none sm:col-span-2" />
                <input name="line1" required placeholder="Address line 1" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none sm:col-span-2" />
                <input name="line2" placeholder="Address line 2" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none sm:col-span-2" />
                <input name="city" required placeholder="City" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none" />
                <input name="state" required placeholder="State" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none" />
                <input name="zip" required placeholder="ZIP" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none" />
                <input name="country" defaultValue="US" placeholder="Country" className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none" />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="isDefault" />
                  Set as default
                </label>
                <button
                  disabled={addrBusy}
                  className="sm:col-span-2 h-11 rounded-[10px] bg-brand text-sm font-semibold uppercase text-white disabled:opacity-60"
                >
                  {addrBusy ? "Saving…" : "Save address"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    )
  }

  const inputClass = "h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
  const checkoutRedirect =
    redirectTo === "/checkout" || redirectTo.startsWith("/checkout")
  const title = savingItem
    ? "Sign in to save"
    : checkoutRedirect
      ? authView === "login"
        ? "Sign in to checkout"
        : "Create account to checkout"
      : authView === "login"
        ? "Sign in"
        : "Create account"

  return (
    <main className="store-container py-10 md:py-16">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div>
          <h1 className="text-[28px] font-bold">{title}</h1>
          <p className="mt-2 text-[14px] text-[#666]">
            {savingItem
              ? "Continue with Google, email, or your phone number. This item will then appear in Saved."
              : checkoutRedirect
                ? "Sign in or register to enter your address and place a Cash on Delivery order. Your bag items stay with you."
                : "Continue with Google, email, or your phone number."}
          </p>
        </div>

        {method === "choose" ? (
          <>
            <SignInMethods
              busy={loginBusy}
              onGoogle={() => void onGoogle()}
              onEmail={() => {
                setMethod("email")
                setPhoneValue("")
              }}
              onPhone={() => setMethod("phone")}
            />
            <p className="text-[13px] text-[#666]">
              {authView === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView("register")
                      setMethod("choose")
                    }}
                    className="font-semibold text-primary-text underline"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView("login")
                      setMethod("choose")
                    }}
                    className="font-semibold text-primary-text underline"
                  >
            Sign in
          </button>
                </>
              )}
            </p>
          </>
        ) : (
          <form
            className="space-y-4"
            onSubmit={authView === "login" ? onLogin : onRegister}
            onChange={() => {
              if (unverifiedEmail) setUnverifiedEmail(null)
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMethod("choose")
                setUnverifiedEmail(null)
              }}
              className="text-[13px] font-semibold text-primary-text underline"
            >
              All sign-in options
            </button>
            {authView === "register" && (
              <input name="name" required className={inputClass} placeholder="Full name" autoComplete="name" />
            )}
            {method === "email" ? (
              <input
                name="email"
                required
                className={inputClass}
                placeholder="Email"
                type="email"
                autoComplete="email"
              />
            ) : (
              <PhoneField
                value={phoneValue}
                onChange={setPhoneValue}
                required
                variant="pill"
              />
            )}
            <input
              name="password"
              required
              minLength={authView === "register" ? 8 : undefined}
              className={inputClass}
              placeholder={authView === "register" ? "Password (8+ characters)" : "Password"}
              type="password"
              autoComplete={authView === "login" ? "current-password" : "new-password"}
            />
            {authView === "login" && unverifiedEmail ? (
              <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-[13px] font-medium text-red-700">Email verification required</p>
                <Link
                  href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="flex h-11 w-full items-center justify-center rounded-[10px] bg-brand text-[13px] font-semibold uppercase tracking-wide text-white hover:bg-brand-dark"
                >
                  Verify email
                </Link>
              </div>
            ) : null}
            <button
              disabled={loginBusy || regBusy}
              className="h-12 w-full rounded-[10px] bg-brand text-[15px] font-semibold uppercase text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {loginBusy || regBusy
                ? "Please wait…"
                : authView === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
            {authView === "login" && method === "email" && (
              <p className="text-[13px] text-[#666]">
                <Link href="/forgot-password" className="underline">
                  Forgot password?
                </Link>
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="store-container space-y-5 py-10 md:py-16">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="mx-auto max-w-md space-y-3 pt-4">
            <Skeleton className="h-12 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-[10px]" />
          </div>
        </main>
      }
    >
      <AccountInner />
    </Suspense>
  )
}
