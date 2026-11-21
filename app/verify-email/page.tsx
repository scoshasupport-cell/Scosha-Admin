"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { consumeWishlistRedirect } from "@/lib/pending-wishlist"
import { useAuth } from "@/lib/auth"
import { Suspense } from "react"

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const emailFromQuery = params.get("email") || ""
  const { verifyEmail, resendOtp } = useAuth()
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState(emailFromQuery)

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery)
  }, [emailFromQuery])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const otp = String(fd.get("otp") || "")
    setBusy(true)
    try {
      await verifyEmail(email, otp)
      const savedNext = consumeWishlistRedirect()
      toast.success(savedNext ? "Saved to your wishlist" : "Email verified")
      router.push(savedNext || "/checkout")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed")
    } finally {
      setBusy(false)
    }
  }

  async function onResend() {
    try {
      const res = await resendOtp(email)
      toast.success(res.message || "OTP resent")
      if (res.devOtp) toast.message(`Dev OTP: ${res.devOtp}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not resend")
    }
  }

  return (
    <main className="store-container py-10 md:py-16">
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
        <h1 className="text-[28px] font-bold">Verify email</h1>
        <p className="text-sm text-muted">Enter the 6-digit code we sent to your email.</p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
          placeholder="Email"
        />
        <input
          name="otp"
          required
          pattern="[0-9]{6}"
          maxLength={6}
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none tracking-[0.4em] text-center"
          placeholder="••••••"
        />
        <button
          disabled={busy}
          className="h-12 w-full rounded-[10px] bg-brand text-[15px] font-semibold uppercase text-white disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Verify"}
        </button>
        <button type="button" onClick={() => void onResend()} className="w-full text-sm underline text-muted">
          Resend code
        </button>
        <p className="text-center text-sm">
          <Link href="/account" className="underline">
            Back to account
          </Link>
        </p>
      </form>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="store-container py-16 text-center">Loading…</main>}>
      <VerifyForm />
    </Suspense>
  )
}
