"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useBagCart } from "@/hooks/useBagCart"
import type { ApiAddress, ApiOrder } from "@/lib/shop-api"
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/commerce"
import { Skeleton } from "@/components/ui/skeleton"

type Step = "address" | "delivery" | "review"

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const { lines, subtotal, clear } = useBagCart()
  const [step, setStep] = useState<Step>("address")
  const [addresses, setAddresses] = useState<ApiAddress[]>([])
  const [addressId, setAddressId] = useState<string>("")
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">("standard")
  const [couponCode, setCouponCode] = useState("")
  const [discount, setDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [newAddr, setNewAddr] = useState({
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    zip: "",
    country: "Lebanon",
  })

  const vipDiscountPreview =
    user?.vipPendingDiscountPercent && user.vipPendingDiscountPercent > 0
      ? Math.round(subtotal * (user.vipPendingDiscountPercent / 100) * 100) / 100
      : 0
  const effectiveDiscount = Math.max(discount, vipDiscountPreview)

  const shipping =
    deliveryMethod === "express"
      ? SHIPPING_FEE + 6
      : subtotal >= FREE_SHIPPING_THRESHOLD ||
          (user?.freeDeliveryCredits || 0) > 0 ||
          subtotal === 0
        ? 0
        : SHIPPING_FEE
  const total = Math.max(0, subtotal + shipping - effectiveDiscount)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/account?redirect=${encodeURIComponent("/checkout")}`)
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return
    ;(async () => {
      try {
        const res = await api.get<ApiAddress[]>("/addresses")
        const list = Array.isArray(res.data) ? res.data : []
        setAddresses(list)
        const def = list.find((a) => a.isDefault) || list[0]
        if (def) setAddressId(String(def.id ?? def._id))
      } catch {
        /* empty */
      }
    })()
  }, [isAuthenticated])

  async function saveAddress(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const email =
        typeof user?.email === "string" && user.email.includes("@") ? user.email : undefined
      const res = await api.post<ApiAddress>("/addresses", {
        ...newAddr,
        ...(email ? { email } : {}),
        isDefault: addresses.length === 0,
      })
      const id = String(res.data.id ?? res.data._id)
      setAddresses((prev) => [...prev, res.data])
      setAddressId(id)
      setStep("delivery")
      toast.success("Address saved")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save address")
    } finally {
      setBusy(false)
    }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return
    try {
      const res = await api.post<{ discount?: number; amount?: number }>("/coupons/validate", {
        code: couponCode.trim(),
        subtotal,
      })
      const d = Number(res.data.discount ?? res.data.amount ?? 0)
      setDiscount(d)
      toast.success(d ? `Coupon applied (−$${d.toFixed(2)})` : "Coupon accepted")
    } catch (err) {
      setDiscount(0)
      toast.error(err instanceof ApiError ? err.message : "Invalid coupon")
    }
  }

  // Match API: email accounts must verify; phone-only accounts can place COD without email.
  const needsEmailVerify = Boolean(user?.email) && !user?.isEmailVerified

  async function placeOrder() {
    if (!addressId) {
      toast.error("Select a shipping address")
      setStep("address")
      return
    }
    if (needsEmailVerify) {
      toast.error("Verify your email before placing an order")
      router.push(`/verify-email?email=${encodeURIComponent(user?.email || "")}`)
      return
    }
    if (!lines.length) {
      toast.error("Your bag is empty")
      return
    }
    setBusy(true)
    try {
      await api.post("/orders/preview", {
        addressId,
        deliveryMethod,
        couponCode: couponCode || undefined,
      })
      const res = await api.post<ApiOrder>("/orders", {
        addressId,
        deliveryMethod,
        couponCode: couponCode || undefined,
      })
      await clear()
      if (res.data.vipUnlocked || res.data.vipReward?.isNewVip) {
        sessionStorage.setItem("scosha_vip_unlocked", "1")
      }
      const id = String(res.data.id ?? res.data._id ?? res.data.orderNumber)
      toast.success("Order placed (Cash on Delivery)")
      router.push(`/order-confirmation/${encodeURIComponent(id)}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not place order")
    } finally {
      setBusy(false)
    }
  }

  if (loading || !isAuthenticated) {
    return (
      <main className="store-container space-y-5 py-10 md:py-16">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-[10px]" />
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </main>
    )
  }

  if (!lines.length) {
    return (
      <main className="store-container py-16 text-center space-y-4">
        <p>Your bag is empty.</p>
        <Link href="/shop" className="btn-primary inline-block px-6 py-3 text-xs">
          Continue shopping
        </Link>
      </main>
    )
  }

  return (
    <main className="store-container py-10 md:py-16">
      <h1 className="mb-8 text-[28px] font-bold">Checkout</h1>
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex gap-2 text-xs font-bold uppercase tracking-wider">
            {(["address", "delivery", "review"] as Step[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`rounded-full px-4 py-2 ${step === s ? "bg-brand text-white" : "bg-surface-2 text-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>

          {step === "address" && (
            <div className="space-y-4 rounded-2xl border border-border-subtle bg-white p-6">
              {addresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Saved addresses</p>
                  {addresses.map((a) => {
                    const id = String(a.id ?? a._id)
                    return (
                      <label key={id} className="flex gap-3 rounded-xl border border-border-subtle p-3 text-sm">
                        <input
                          type="radio"
                          name="address"
                          checked={addressId === id}
                          onChange={() => setAddressId(id)}
                        />
                        <span>
                          <strong>{a.name}</strong> — {a.line1}, {a.city}
                        </span>
                      </label>
                    )
                  })}
                  <button
                    type="button"
                    className="btn-primary mt-2 px-5 py-2 text-xs"
                    onClick={() => setStep("delivery")}
                    disabled={!addressId}
                  >
                    Continue
                  </button>
                </div>
              )}
              <form onSubmit={saveAddress} className="grid gap-3 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm font-semibold">Add new address</p>
                {(
                  [
                    ["name", "Full name"],
                    ["phone", "Phone"],
                    ["line1", "Address line"],
                    ["city", "City"],
                    ["state", "State"],
                    ["zip", "ZIP"],
                    ["country", "Country"],
                  ] as const
                ).map(([key, label]) => (
                  <input
                    key={key}
                    required
                    className="h-11 rounded-full bg-[#ededed] px-4 text-sm outline-none sm:col-span-1"
                    placeholder={label}
                    value={newAddr[key]}
                    onChange={(e) => setNewAddr((s) => ({ ...s, [key]: e.target.value }))}
                  />
                ))}
                <button
                  disabled={busy}
                  className="sm:col-span-2 h-11 rounded-xl bg-black text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"
                >
                  Save & continue
                </button>
              </form>
            </div>
          )}

          {step === "delivery" && (
            <div className="space-y-4 rounded-2xl border border-border-subtle bg-white p-6">
              <label className="flex gap-3 rounded-xl border p-3 text-sm">
                <input
                  type="radio"
                  checked={deliveryMethod === "standard"}
                  onChange={() => setDeliveryMethod("standard")}
                />
                Standard (
                {subtotal >= FREE_SHIPPING_THRESHOLD || (user?.freeDeliveryCredits || 0) > 0
                  ? "FREE"
                  : `$${SHIPPING_FEE}`}
                )
              </label>
              <label className="flex gap-3 rounded-xl border p-3 text-sm">
                <input
                  type="radio"
                  checked={deliveryMethod === "express"}
                  onChange={() => setDeliveryMethod("express")}
                />
                Express
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="h-11 flex-1 rounded-full bg-[#ededed] px-4 text-sm outline-none"
                />
                <button type="button" onClick={() => void applyCoupon()} className="btn-secondary px-4 text-xs">
                  Apply
                </button>
              </div>
              <button type="button" className="btn-primary px-6 py-3 text-xs" onClick={() => setStep("review")}>
                Review order
              </button>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4 rounded-2xl border border-border-subtle bg-white p-6">
              <p className="text-sm text-muted">
                Payment: <strong className="text-primary-text">Cash on Delivery</strong>
              </p>
              {needsEmailVerify && (
                <p className="text-sm text-[#DC2626]">
                  Email not verified.{" "}
                  <Link className="underline" href={`/verify-email?email=${encodeURIComponent(user?.email || "")}`}>
                    Verify now
                  </Link>
                </p>
              )}
              <button
                type="button"
                disabled={busy || needsEmailVerify}
                onClick={() => void placeOrder()}
                className="h-12 w-full rounded-xl text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"
                style={{ background: "#7A1F2B" }}
              >
                {busy ? "Placing order…" : "Place COD order"}
              </button>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border-subtle bg-white p-6 space-y-3 text-sm">
          <h2 className="font-bold uppercase tracking-wider text-xs">Order summary</h2>
          {lines.map((l) => (
            <div key={l.variantId} className="flex justify-between gap-3 text-xs">
              <span className="line-clamp-2">
                {l.title} × {l.quantity}
              </span>
              <span>${(l.price * l.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
            </div>
            {effectiveDiscount > 0 && (
              <div className="flex justify-between text-brand">
                <span>
                  {vipDiscountPreview > discount
                    ? `VIP ${user?.vipPendingDiscountPercent}% off`
                    : "Discount"}
                </span>
                <span>−${effectiveDiscount.toFixed(2)}</span>
              </div>
            )}
            {(user?.freeDeliveryCredits || 0) > 0 &&
              shipping === 0 &&
              subtotal < FREE_SHIPPING_THRESHOLD && (
                <p className="text-[11px] text-brand">VIP free delivery credit will be used</p>
              )}
            {subtotal >= 300 && (
              <p className="text-[11px] text-brand">
                {user?.isVip
                  ? "This order tops up VIP rewards"
                  : "This $300+ order unlocks VIP automatically"}
              </p>
            )}
            <div className="flex justify-between font-bold text-sm pt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
