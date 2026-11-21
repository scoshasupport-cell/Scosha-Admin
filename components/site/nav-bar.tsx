"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { MAIN_NAV, isSubActive } from "@/lib/category-routes"
import {
  buildChannelSubcategories,
  type MainChannel,
} from "@/lib/product-types"
import { PRODUCTS } from "@/lib/products"

function navChannel(label: string): MainChannel | null {
  const key = label.toLowerCase()
  if (key === "women" || key === "men" || key === "kids" || key === "shoes") return key
  if (key === "accessories") return "accessories"
  if (key === "home" || key === "furniture") return "home"
  return null
}

export default function NavBar() {
  const pathname = usePathname()
  const search = useSearchParams()
  const category = (search.get("category") || "").toLowerCase()
  const sub = (search.get("subCategory") || "").toLowerCase()
  const [openLabel, setOpenLabel] = useState<string | null>(null)

  const subsByLabel = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildChannelSubcategories>> = {}
    for (const item of MAIN_NAV) {
      const ch = navChannel(item.label)
      if (!ch) continue
      map[item.label] = buildChannelSubcategories(ch, PRODUCTS)
    }
    return map
  }, [])

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
      <ul className="flex flex-nowrap items-center justify-center gap-x-3 xl:gap-x-7 2xl:gap-x-9">
        {MAIN_NAV.map((item) => {
          const url = new URL(item.href, "http://local")
          const itemCat = (url.searchParams.get("category") || "").toLowerCase()
          const itemPath = url.pathname
          const isComingSoon = itemPath === "/skincare" || itemPath === "/electronics"
          const active = isComingSoon
            ? pathname.startsWith(itemPath)
            : itemCat === "furniture"
              ? category === "furniture"
              : category === "clothes" && isSubActive(sub, item.href)
          const subs = subsByLabel[item.label] || []
          const hasMenu = subs.length > 0

          return (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => hasMenu && setOpenLabel(item.label)}
              onMouseLeave={() => setOpenLabel(null)}
            >
              <Link
                href={item.href}
                className={`relative block whitespace-nowrap py-1 text-[11px] font-medium tracking-[0.03em] transition-colors xl:text-[12px] xl:tracking-[0.04em] ${
                  active ? "text-brand" : "text-primary-text hover:text-brand"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-brand" />
                )}
              </Link>

              {hasMenu && openLabel === item.label && (
                <div className="absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3">
                  <div className="rounded-2xl border border-border-subtle bg-white p-3 shadow-lg">
                    <Link
                      href={item.href}
                      className="mb-1 block rounded-lg px-3 py-2 text-xs font-semibold text-primary-text hover:bg-brand-light hover:text-brand"
                    >
                      All {item.label}
                    </Link>
                    <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                      {subs.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={s.href}
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-subtext hover:bg-brand-light hover:text-brand"
                          >
                            <span>{s.label}</span>
                            <span className="text-[10px] opacity-60">{s.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
