"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Shirt, Home, Sparkles, Smartphone } from "lucide-react"

/** Compact department strip — uses same routes as main category navbar. */
export function DepartmentTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = (searchParams.get("category") || "").toLowerCase()

  const tabs = [
    {
      href: "/shop?category=clothes",
      label: "Clothes",
      active:
        category === "clothes" ||
        (pathname.startsWith("/shop") && !["furniture", "skincare", "electronics"].includes(category)),
      icon: Shirt,
      badge: "Winter",
    },
    {
      href: "/shop?category=furniture",
      label: "Home",
      active: category === "furniture",
      icon: Home,
      badge: "Living",
    },
    {
      href: "/skincare",
      label: "Skincare",
      active: pathname.startsWith("/skincare"),
      icon: Sparkles,
      badge: "Soon",
    },
    {
      href: "/electronics",
      label: "Electronics",
      active: pathname.startsWith("/electronics"),
      icon: Smartphone,
      badge: "Soon",
    },
  ] as const

  return (
    <div className="sticky top-14 z-30 w-full border-b border-border-subtle bg-surface/95 backdrop-blur-md sm:top-16 lg:top-[68px]">
      <div className="store-container flex items-center gap-2 py-1.5 sm:py-2">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => router.push(tab.href)}
                className={`inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                  tab.active
                    ? "text-white shadow-md"
                    : "bg-white text-subtext ring-1 ring-border-subtle hover:bg-brand-light hover:text-brand"
                }`}
                style={tab.active ? { background: "#7A1F2B" } : {}}
              >
                <Icon size={13} className="shrink-0" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    tab.active ? "bg-white/20 text-white" : "bg-brand-light text-brand"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
