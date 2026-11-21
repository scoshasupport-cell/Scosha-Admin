"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingBag, Heart, User, Shirt } from "lucide-react"
import { useBagCart } from "@/hooks/useBagCart"
import { useShopWishlist } from "@/hooks/useShopWishlist"

const SALE = "#7A1F2B"

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
          { href: "/shop", label: "Shop", icon: Shirt, match: (p: string) => p.startsWith("/shop") || p.startsWith("/product") },
  { href: "/wishlist", label: "Saved", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { openCart, count } = useBagCart()
  const { count: wishCount } = useShopWishlist()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-5 px-0.5 py-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex min-h-12 min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[9px] font-semibold uppercase tracking-[0.02em] min-[400px]:text-[10px]"
              style={{ color: active ? SALE : "#94A3B8" }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
              <span className="max-w-full truncate">{tab.label}</span>
              {tab.href === "/wishlist" && wishCount > 0 && (
                <span
                  className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ background: SALE }}
                >
                  {wishCount}
                </span>
              )}
              {active && (
                <span
                  className="absolute bottom-0 h-0.5 w-8 rounded-full"
                  style={{ background: SALE }}
                />
              )}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={openCart}
          className="relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[9px] font-semibold uppercase tracking-[0.02em] text-muted min-[400px]:text-[10px]"
        >
          <ShoppingBag size={20} strokeWidth={1.7} />
          <span>Bag</span>
          {count > 0 && (
            <span
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
              style={{ background: SALE }}
            >
              {count}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}
