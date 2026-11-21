"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Crown, X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { VIP_FREE_DELIVERY_ORDERS, VIP_NEXT_ORDER_DISCOUNT_PERCENT } from "@/lib/commerce"
import { useModalFocus } from "@/hooks/useModalFocus"

export function VipCongratsModal() {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOpen(false)
      return
    }
    const fromCheckout =
      typeof window !== "undefined" && sessionStorage.getItem("scosha_vip_unlocked") === "1"
    if (user.isVip && (!user.vipCongratsSeen || fromCheckout)) {
      setOpen(true)
    }
  }, [isAuthenticated, user])

  const dismiss = useCallback(async () => {
    setBusy(true)
    try {
      await api.post("/vip/congrats/ack")
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("scosha_vip_unlocked")
      }
      await refreshUser()
    } catch {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("scosha_vip_unlocked")
      }
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }, [refreshUser])

  const dialogRef = useModalFocus(open, () => {
    void dismiss()
  })

  if (!open) return null

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[80] flex items-center justify-center p-4 outline-none">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-primary-text/50 backdrop-blur-sm"
        onClick={() => void dismiss()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-congrats-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div
          className="px-6 pb-4 pt-8 text-center text-white"
          style={{ background: "linear-gradient(145deg, #7A1F2B 0%, #5C1520 100%)" }}
        >
          <button
            type="button"
            onClick={() => void dismiss()}
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <Crown size={28} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Private Access</p>
          <h2 id="vip-congrats-title" className="mt-2 font-serif text-2xl font-bold leading-snug sm:text-[28px]">
            Congratulations! You&apos;ve Become a VIP Member!
          </h2>
        </div>
        <div className="space-y-4 px-6 py-6 text-center">
          <p className="text-sm leading-relaxed text-subtext">
            Enjoy {VIP_NEXT_ORDER_DISCOUNT_PERCENT}% off your next order, free delivery on your next{" "}
            {VIP_FREE_DELIVERY_ORDERS} orders, and exclusive early access to our latest collections.
          </p>
          <p className="text-xs text-muted">
            Please log in with your registered email to unlock your VIP benefits on every visit.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
            <Link
              href="/account"
              onClick={() => void dismiss()}
              className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ background: "#7A1F2B" }}
            >
              View my VIP account
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void dismiss()}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border-subtle px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-text hover:bg-surface disabled:opacity-60"
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
