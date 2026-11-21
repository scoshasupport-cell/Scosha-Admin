"use client"

import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { Minus, Plus, X, ShoppingBag, Trash2, ArrowRight } from "lucide-react"
import { useBagCart } from "@/hooks/useBagCart"
import { useAuth } from "@/lib/auth"
import { Price } from "@/components/price"
import { CartLineSkeleton } from "@/components/ui/skeleton"
import { FREE_SHIPPING_THRESHOLD } from "@/lib/commerce"
import { isPlaceholderColorName } from "@/lib/utils"
import { useModalFocus } from "@/hooks/useModalFocus"

export function CartDrawer() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const {
    isOpen,
    lines,
    closeCart,
    removeLine,
    updateQuantity,
    subtotal,
    count: totalCount,
    isLoading,
  } = useBagCart()

  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  const amountRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const dialogRef = useModalFocus(isOpen, closeCart)

  return (
    <div ref={dialogRef} tabIndex={-1} className="outline-none">
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-primary-text/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Shopping bag"
        aria-hidden={!isOpen}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "#7A1F2B" }}
            >
              <ShoppingBag size={16} className="text-white" strokeWidth={1.7} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary-text">
              Shopping Bag{" "}
              {totalCount > 0 && (
                <span className="font-normal text-muted">({totalCount})</span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-xl p-1.5 text-muted transition hover:bg-surface-2 hover:text-primary-text"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="border-b border-border-subtle bg-surface px-6 py-3.5">
          <p className="mb-2.5 text-center text-xs font-medium text-primary-text">
            {amountRemaining === 0 ? (
              <span className="font-bold text-brand">
                ✓ You unlocked FREE Delivery!
              </span>
            ) : (
              <span>
                Add{" "}
                <span className="font-bold text-primary-text">${amountRemaining.toFixed(2)}</span>{" "}
                more for <strong>FREE Delivery</strong>
              </span>
            )}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "#7A1F2B",
              }}
            />
          </div>
        </div>

        {isLoading && lines.length === 0 ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <CartLineSkeleton count={3} />
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-light">
              <ShoppingBag size={32} className="text-brand" strokeWidth={1.5} />
            </div>
            <p className="text-base font-bold uppercase tracking-wider text-primary-text">
              Your bag is empty
            </p>
            <Link
              href="/shop"
              onClick={closeCart}
              className="mt-2 rounded-xl px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow transition-all hover:brightness-110"
              style={{ background: "#7A1F2B" }}
            >
              Shop Clothes Collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 divide-y divide-surface-2">
              {lines.map((line) => (
                <div key={line.variantId} className="flex gap-4 py-4">
                  <Link
                    href={`/product/${line.handle}`}
                    onClick={closeCart}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 border border-border-subtle"
                  >
                    <Image
                      src={line.image || "/placeholder.svg"}
                      alt={line.title}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            {line.brand}
                          </p>
                          <Link
                            href={`/product/${line.handle}`}
                            onClick={closeCart}
                            className="text-xs font-semibold text-primary-text hover:text-brand line-clamp-1 transition-colors"
                          >
                            {line.title}
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeLine(line.variantId)}
                          className="text-muted transition hover:text-[#DC2626]"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                        {line.size && (
                          <span>
                            Size: <strong className="text-primary-text">{line.size}</strong>
                          </span>
                        )}
                        {line.color && !isPlaceholderColorName(line.color) && (
                          <span>
                            · Color: <strong className="text-primary-text">{line.color}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex h-7 items-center overflow-hidden rounded-lg border border-border-subtle bg-surface">
                        <button
                          type="button"
                          onClick={() => void updateQuantity(line.variantId, line.quantity - 1)}
                          className="grid h-full w-7 place-items-center text-subtext transition hover:bg-brand-light hover:text-brand"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-primary-text">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => void updateQuantity(line.variantId, line.quantity + 1)}
                          className="grid h-full w-7 place-items-center text-subtext transition hover:bg-brand-light hover:text-brand"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <Price
                        amount={line.price * line.quantity}
                        className="text-xs font-bold text-primary-text"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle bg-surface p-6">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-subtext">
                  <span>Subtotal</span>
                  <span className="font-semibold text-primary-text">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-subtext">
                  <span>Shipping</span>
                  <span className="font-semibold text-primary-text">
                    {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                      <span className="text-brand">FREE</span>
                    ) : (
                      "$9.00"
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border-subtle pt-2.5 text-sm font-bold text-primary-text">
                  <span>Estimated Total</span>
                  <span>
                    $
                    {(subtotal >= FREE_SHIPPING_THRESHOLD ? subtotal : subtotal + 9).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-nav-away
                onClick={() => {
                  // Do not closeCart() before navigate: modal history.back() races
                  // with location.assign and returns to the previous page.
                  if (authLoading) {
                    window.location.assign("/checkout")
                    return
                  }
                  if (!isAuthenticated) {
                    toast.message("Sign in to complete your order")
                    window.location.assign("/account?redirect=%2Fcheckout&mode=login")
                    return
                  }
                  // Hard navigate so PDP slug canonicalization cannot steal the route.
                  window.location.assign("/checkout")
                }}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/25 transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95"
                style={{ background: "#7A1F2B" }}
              >
                <span>{isAuthenticated ? "Proceed to Checkout" : "Sign in to Checkout"}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
