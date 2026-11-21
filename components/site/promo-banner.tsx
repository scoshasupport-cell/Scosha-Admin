"use client"

import { useEffect, useState } from "react"

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.73 3C9.36 3 9.06 3.01 8.13 3.05C7.2 3.1 6.57 3.24 6.01 3.46C5.44 3.68 4.95 3.98 4.46 4.46C3.98 4.95 3.68 5.44 3.46 6.01C3.24 6.56 3.09 7.2 3.05 8.13C3.01 9.06 3 9.36 3 11.73C3 14.09 3.01 14.39 3.05 15.32C3.1 16.25 3.24 16.88 3.46 17.44C3.68 18.01 3.98 18.5 4.46 18.98C4.95 19.47 5.44 19.77 6.01 19.99C6.56 20.21 7.2 20.35 8.13 20.4C9.06 20.44 9.36 20.45 11.72 20.45C14.09 20.45 14.39 20.44 15.32 20.4C16.25 20.35 16.88 20.21 17.44 19.99C18.01 19.77 18.5 19.47 18.98 18.98C19.47 18.5 19.77 18.01 19.99 17.44C20.21 16.88 20.35 16.25 20.4 15.32C20.44 14.39 20.45 14.09 20.45 11.73C20.45 9.36 20.44 9.06 20.4 8.13C20.35 7.2 20.21 6.56 19.99 6.01C19.77 5.44 19.47 4.95 18.98 4.46C18.5 3.98 18.01 3.68 17.44 3.46C16.88 3.24 16.25 3.1 15.32 3.05C14.39 3.01 14.09 3 11.72 3H11.73ZM16.38 6.02C15.8 6.02 15.34 6.49 15.34 7.07C15.34 7.65 15.8 8.11 16.38 8.11C16.96 8.11 17.43 7.65 17.43 7.07C17.43 6.49 16.96 6.02 16.38 6.02ZM11.73 7.24C9.25 7.24 7.24 9.25 7.24 11.73C7.24 14.2 9.25 16.2 11.73 16.2C14.2 16.2 16.21 14.2 16.21 11.73C16.21 9.25 14.2 7.24 11.73 7.24ZM11.73 8.82C13.33 8.82 14.63 10.12 14.63 11.73C14.63 13.33 13.33 14.63 11.73 14.63C10.12 14.63 8.82 13.33 8.82 11.73C8.82 10.12 10.12 8.82 11.73 8.82Z" />
    </svg>
  )
}

function TiktokIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.8a4.3 4.3 0 0 1-3.1-1.3v9.4a5.1 5.1 0 1 1-4.4-5v2.2a2.9 2.9 0 1 0 2.1 2.8V2h2.3a4.3 4.3 0 0 0 3.1 3.6v2.2Z" />
    </svg>
  )
}

function YoutubeIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4s-3.9 0-6.7.2c-.4.1-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.5c0 1.8.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.9.8 2.3.9C7.1 19 12 19 12 19s3.9 0 6.7-.3c.4-.1 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.7.2-3.5v-1.5c0-1.7-.2-3.5-.2-3.5ZM9.9 14.6V9.4l5.3 2.6-5.3 2.6Z" />
    </svg>
  )
}

const MESSAGES = [
  "ENJOY 10% OFF USING SCOSHA10!",
  "FREE SHIPPING OVER $150 — WORLDWIDE",
  "SPEND $300+ → VIP: 10% NEXT ORDER + 5 FREE DELIVERIES",
  "NOW ACCEPTING APPLE PAY!",
]

export function PromoBanner() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  const message = MESSAGES[index]
  const parts = message.split("SCOSHA10")

  return (
    <div
      className="relative overflow-hidden text-[12px] text-white"
      style={{ background: "#7A1F2B" }}
    >
      {/* Subtle animated shimmer line */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 50%, transparent)",
          animation: "shimmer 3s linear infinite",
        }}
      />
      <div className="store-container relative grid h-10 grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <p
          className="truncate text-center font-semibold tracking-wide transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {parts.length > 1 ? (
            <>
              {parts[0]}
              <span className="font-black text-highlight underline underline-offset-2">SCOSHA10</span>
              {parts[1]}
            </>
          ) : (
            message
          )}
        </p>
        <div className="hidden items-center justify-end gap-3.5 lg:flex">
          <a href="#" aria-label="Instagram" className="text-white/70 transition hover:text-white">
            <InstagramIcon />
          </a>
          <a href="#" aria-label="TikTok" className="text-white/70 transition hover:text-white">
            <TiktokIcon />
          </a>
          <a href="#" aria-label="YouTube" className="text-white/70 transition hover:text-white">
            <YoutubeIcon />
          </a>
        </div>
      </div>
    </div>
  )
}
