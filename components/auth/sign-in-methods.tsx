"use client"

import { Mail, Phone } from "lucide-react"

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
    </svg>
  )
}

const buttonClass =
  "flex h-12 w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white px-4 text-[15px] font-semibold text-primary-text transition hover:bg-[#faf7f7] disabled:opacity-60"

export function SignInMethods({
  onGoogle,
  onEmail,
  onPhone,
  busy,
}: {
  onGoogle: () => void
  onEmail: () => void
  onPhone: () => void
  busy?: boolean
}) {
  return (
    <div className="space-y-3">
      <button type="button" className={buttonClass} disabled={busy} onClick={onGoogle}>
        <GoogleMark />
        Continue with Google
      </button>
      <button type="button" className={buttonClass} disabled={busy} onClick={onEmail}>
        <Mail size={18} strokeWidth={1.75} />
        Continue with email
      </button>
      <button type="button" className={buttonClass} disabled={busy} onClick={onPhone}>
        <Phone size={18} strokeWidth={1.75} />
        Continue with phone
      </button>
    </div>
  )
}
