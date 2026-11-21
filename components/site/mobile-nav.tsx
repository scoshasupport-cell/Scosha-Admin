"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { X, Search, ChevronRight, ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { MAIN_NAV } from "@/lib/main-nav"
import { buildChannelSubcategories, type MainChannel } from "@/lib/product-types"
import { PRODUCTS } from "@/lib/products"
import { useSkinScan } from "@/lib/store"
import { useModalFocus } from "@/hooks/useModalFocus"
import Logo from "./logo"

function navChannel(label: string): MainChannel | null {
  const key = label.toLowerCase()
  if (key === "women" || key === "men" || key === "kids" || key === "shoes") return key
  if (key === "accessories") return "accessories"
  if (key === "home" || key === "furniture") return "home"
  return null
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const openScan = useSkinScan((state) => state.open)
  const dialogRef = useModalFocus(open, onClose)
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const subsByLabel = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildChannelSubcategories>> = {}
    for (const item of MAIN_NAV) {
      const ch = navChannel(item.label)
      if (!ch) continue
      map[item.label] = buildChannelSubcategories(ch, PRODUCTS)
    }
    return map
  }, [])

  function handleClose() {
    onClose()
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      handleClose()
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div ref={dialogRef} tabIndex={-1} className="outline-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-primary-text/40 backdrop-blur-sm lg:hidden"
            onClick={handleClose}
          />

          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-y-0 left-0 z-[60] flex w-[min(86vw,20rem)] max-w-sm flex-col overflow-hidden bg-surface text-primary-text shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-5">
              <Logo />
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center text-subtext transition hover:text-brand"
              >
                <X size={20} strokeWidth={1.8} />
              </button>
            </div>

            <div className="shrink-0 border-b border-border-subtle px-4 py-3">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the collection..."
                  className="h-10 w-full rounded-md border border-border-subtle bg-white pl-4 pr-10 text-[13px] text-primary-text outline-none placeholder:text-muted focus:border-brand"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtext hover:text-brand"
                >
                  <Search size={16} strokeWidth={1.8} />
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y divide-border-subtle">
                {MAIN_NAV.map((item) => {
                  const subs = subsByLabel[item.label] || []
                  const isOpen = expanded === item.label
                  return (
                    <li key={item.label}>
                      <div className="flex items-center">
                        <Link
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault()
                            handleClose()
                            window.setTimeout(() => router.push(item.href), 0)
                          }}
                          className="flex min-h-12 flex-1 touch-manipulation items-center px-5 py-4 text-[14px] font-medium tracking-wide text-primary-text transition hover:text-brand"
                        >
                          {item.label}
                        </Link>
                        {subs.length > 0 ? (
                          <button
                            type="button"
                            aria-label={`Expand ${item.label}`}
                            onClick={() => setExpanded(isOpen ? null : item.label)}
                            className="flex h-12 w-12 touch-manipulation items-center justify-center text-muted"
                          >
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center text-muted">
                            <ChevronRight size={16} />
                          </span>
                        )}
                      </div>
                      {isOpen && subs.length > 0 && (
                        <ul className="border-t border-border-subtle bg-white/60 pb-2">
                          {subs.map((s) => (
                            <li key={s.slug}>
                              <Link
                                href={s.href}
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleClose()
                                  window.setTimeout(() => router.push(s.href), 0)
                                }}
                                className="flex min-h-11 touch-manipulation items-center justify-between px-8 py-2.5 text-[13px] text-subtext hover:text-brand"
                              >
                                <span>{s.label}</span>
                                <span className="text-[11px] text-muted">{s.count}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
                <li>
                  <Link
                    href="/shop?discounted=true"
                    onClick={handleClose}
                    className="flex items-center justify-between px-5 py-4 text-[14px] font-medium tracking-wide text-brand"
                  >
                    <span>Sale</span>
                    <ChevronRight size={16} className="text-brand/50" />
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose()
                      openScan()
                    }}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[14px] font-medium tracking-wide text-primary-text transition hover:text-brand"
                  >
                    <span className="flex items-center gap-3">
                      <span className="relative block h-10 w-10 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/10">
                        <Image
                          src="/AiFloating%20icon.jpeg"
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                      AI Scan
                    </span>
                    <ChevronRight size={16} className="text-muted" />
                  </button>
                </li>
              </ul>

              <div className="mt-6 space-y-3 px-5 pb-8 text-[13px] text-subtext">
                <Link href="/contact" onClick={handleClose} className="block hover:text-brand">
                  Contact Us
                </Link>
                <Link href="/about" onClick={handleClose} className="block hover:text-brand">
                  Our Story
                </Link>
                <Link href="/wishlist" onClick={handleClose} className="block hover:text-brand">
                  Wishlist
                </Link>
                <Link href="/account" onClick={handleClose} className="block hover:text-brand">
                  Account
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
