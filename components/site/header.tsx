"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { Heart, Menu, Search, User, ShoppingBag, X } from "lucide-react"
import Logo from "./logo"
import NavBar from "./nav-bar"
import { MobileNav } from "./mobile-nav"
import { PredictiveSearch } from "./predictive-search"
import { useBagCart } from "@/hooks/useBagCart"
import { useShopWishlist } from "@/hooks/useShopWishlist"
import { useAuth } from "@/lib/auth"
import { useSkinScan } from "@/lib/store"
import { useHasMounted } from "@/hooks/useHasMounted"

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const hasMounted = useHasMounted()
  const { openCart, count: cartCount } = useBagCart()
  const { count: wishCount } = useShopWishlist()
  const bagBadge = hasMounted ? cartCount : 0
  const savedBadge = hasMounted ? wishCount : 0
  const { isAuthenticated, user } = useAuth()
  const openAi = useSkinScan((s) => s.open)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 bg-surface transition-shadow duration-300 ${
        scrolled ? "shadow-[0_1px_0_0_var(--color-border-subtle)]" : ""
      }`}
    >
      <div className="store-container flex h-14 min-w-0 items-center justify-between gap-1 sm:h-16 sm:gap-3 lg:h-[68px] lg:gap-4">
        {/* Left: menu (mobile) + logo */}
        <div className="flex h-full min-w-0 items-center gap-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center text-primary-text lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.6} />
          </button>
          <Logo size="md" />
        </div>

        {/* Center nav — desktop */}
        <Suspense fallback={<div className="hidden h-10 flex-1 lg:block" />}>
          <NavBar />
        </Suspense>

        {/* Right icons — Account lives in bottom nav / menu on small phones */}
        <div className="flex shrink-0 items-center gap-0 sm:gap-0.5">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center text-primary-text transition hover:text-brand sm:h-11 sm:w-11"
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            {searchOpen ? <X size={20} strokeWidth={1.6} /> : <Search size={20} strokeWidth={1.6} />}
          </button>

          <Link
            href="/account"
            className="hidden h-11 w-11 items-center justify-center text-primary-text transition hover:text-brand sm:flex"
            aria-label={isAuthenticated ? user?.name || "Account" : "Sign in"}
          >
            <User size={20} strokeWidth={1.6} />
          </Link>

          <Link
            href="/wishlist"
            className="relative hidden h-10 w-10 items-center justify-center text-primary-text transition hover:text-brand sm:flex sm:h-11 sm:w-11"
            aria-label="Wishlist"
          >
            <Heart size={20} strokeWidth={1.6} />
            {savedBadge > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                {savedBadge}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={openAi}
            className="group relative flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11"
            aria-label="Open AI scan"
          >
            <span className="relative grid h-[30px] w-[30px] place-items-center transition-transform duration-200 group-hover:scale-105 sm:h-8 sm:w-8">
              <span
                aria-hidden
                className="absolute inset-0 rounded-[10px] shadow-[0_3px_10px_rgba(122,31,43,0.2)]"
                style={{
                  background:
                    "linear-gradient(145deg, #7A1F2B 0%, #E8C4C8 42%, #7A1F2B 78%, #C4A574 100%)",
                }}
              />
              <span className="relative z-[1] flex h-[calc(100%-3px)] w-[calc(100%-3px)] items-center justify-center rounded-[8px] bg-white font-serif text-[12px] font-semibold leading-none tracking-[0.04em] text-[#7A1F2B]">
                AI
              </span>
              <svg
                viewBox="0 0 12 12"
                aria-hidden
                className="absolute -right-0.5 -top-1 z-[2] h-2.5 w-2.5 text-[#7A1F2B]"
              >
                <path
                  fill="currentColor"
                  d="M6 0.4 7.15 4.4 11.6 6 7.15 7.6 6 11.6 4.85 7.6 0.4 6 4.85 4.4Z"
                />
              </svg>
            </span>
          </button>

          <button
            type="button"
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center text-primary-text transition hover:text-brand sm:h-11 sm:w-11"
            aria-label="Open bag"
          >
            <ShoppingBag size={20} strokeWidth={1.6} />
            {bagBadge > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                {bagBadge}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border-subtle bg-surface px-4 py-3 sm:px-6">
          <div className="store-container max-w-2xl">
            <PredictiveSearch
              className="relative w-full"
              onNavigate={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  )
}
