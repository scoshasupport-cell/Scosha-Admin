"use client"

import Link from "next/link"
import { FormEvent, Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { resetPassword } = useAuth()
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState(params.get("email") || "")
  const [token, setToken] = useState(params.get("token") || "")

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get("password") || "")
    const confirm = String(fd.get("confirm") || "")
    if (password !== confirm) {
      toast.error("Passwords do not match")
      return
    }
    setBusy(true)
    try {
      await resetPassword({ email, token, password })
      toast.success("Password updated")
      router.push("/account")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reset failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="store-container py-10 md:py-16">
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
        <h1 className="text-[28px] font-bold">Reset password</h1>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
          placeholder="Email"
        />
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
          placeholder="Reset token"
        />
        <input
          name="password"
          required
          minLength={8}
          type="password"
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
          placeholder="New password"
        />
        <input
          name="confirm"
          required
          minLength={8}
          type="password"
          className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
          placeholder="Confirm password"
        />
        <button
          disabled={busy}
          className="h-12 w-full rounded-[10px] bg-brand text-[15px] font-semibold uppercase text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Update password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="store-container py-16 text-center text-sm text-muted">Loading…</main>}>
      <ResetForm />
    </Suspense>
  )
}
