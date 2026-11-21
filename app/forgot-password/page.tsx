"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get("email") || "")
    setBusy(true)
    setMessage(null)
    try {
      const msg = await forgotPassword(email)
      setMessage(msg)
      toast.success("Check your email")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="store-container py-10 md:py-16">
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
        <h1 className="text-[28px] font-bold">Forgot password</h1>
        <p className="text-sm text-muted">
          We will email you a link to reset your password.
        </p>
        <input
          name="email"
          required
          type="email"
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
          placeholder="Email"
        />
        {message && <p className="text-sm text-subtext">{message}</p>}
        <button
          disabled={busy}
          className="h-12 w-full rounded-[10px] bg-brand text-[15px] font-semibold uppercase text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <p className="text-center text-[13px] text-[#666]">
          <Link href="/account" className="underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
