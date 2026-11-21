"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/site/header"
import { Footer } from "@/components/site/footer"
import { CartDrawer } from "@/components/site/cart-drawer"
import { AIShoppingAssistant } from "@/components/ai/ai-shopping-assistant"
import { FloatingWidgets } from "@/components/site/floating-widgets"
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav"
import { QuickView } from "@/components/product/quick-view"
import { useAuth } from "@/lib/auth"

const AUTH_FORM_PATHS = ["/forgot-password", "/reset-password", "/verify-email"]

function shouldHideFooter(pathname: string, isAuthenticated: boolean) {
  if (AUTH_FORM_PATHS.some((p) => pathname.startsWith(p))) return true
  if (pathname.startsWith("/account") && !isAuthenticated) return true
  return false
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/"
  const { isAuthenticated } = useAuth()
  const hideFooter = shouldHideFooter(pathname, isAuthenticated)

  return (
    <>
      <Header />
      {/* Clearance for fixed mobile bottom nav (incl. iOS safe area) */}
      <div className="pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
        {!hideFooter && <Footer />}
      </div>
      <CartDrawer />
      <QuickView />
      <AIShoppingAssistant />
      <FloatingWidgets />
      <MobileBottomNav />
    </>
  )
}
