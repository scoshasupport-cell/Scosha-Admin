"use client"

import { useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { useCart as useLocalCart } from "@/lib/store"
import { useActiveCart } from "@/hooks/useCart"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"
import {
  cartItemId,
  mapCartItemToLine,
  findVariantId,
  type ApiCartItem,
} from "@/lib/shop-api"
import type { CartLine, Product } from "@/types/ecommerce"
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/commerce"
import { useHasMounted } from "@/hooks/useHasMounted"

/**
 * Hybrid bag: prefer the API cart; fall back to local Zustand only if the API is down.
 * API cart is owner-scoped (user id or per-browser guest session).
 */
export function useBagCart() {
  const hasMounted = useHasMounted()
  const local = useLocalCart()
  const resetLocalForOwner = useLocalCart((s) => s.resetForOwner)
  const apiCart = useActiveCart()
  const { user, loading: authLoading } = useAuth()

  const apiReachable = !apiCart.isError
  const useApi = hasMounted && apiReachable && !apiCart.isLoading && !authLoading

  // Keep offline fallback cart tied to the current account / guest
  useEffect(() => {
    if (authLoading) return
    const ownerKey = user?.id != null ? `user:${user.id}` : "guest"
    resetLocalForOwner(ownerKey)
  }, [authLoading, user?.id, resetLocalForOwner])

  useEffect(() => {
    if (apiCart.stockAdjusted && apiCart.stockMessages?.length) {
      toast.message(apiCart.stockMessages.join(" · "))
    }
  }, [apiCart.stockAdjusted, apiCart.stockMessages])

  const lines: CartLine[] = useMemo(() => {
    if (!hasMounted) return []
    if (useApi && apiCart.data) {
      return (apiCart.items ?? []).map(mapCartItemToLine)
    }
    return local.lines
  }, [hasMounted, useApi, apiCart.data, apiCart.items, local.lines])

  const count = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines],
  )
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.price * l.quantity, 0),
    [lines],
  )
  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE

  const addProduct = useCallback(
    async (product: Product, opts?: { size?: string; color?: string; quantity?: number }) => {
      const variantId = findVariantId(product, opts?.size, opts?.color)
      if (!variantId) {
        toast.error("This option is unavailable")
        return
      }
      const variant = product.variants?.find((v) => String(v.id) === String(variantId))
      const stock = variant?.stock ?? 0
      if (variant && !(variant.inStock && stock > 0)) {
        toast.error("That size is out of stock — pick an available size")
        return
      }
      const qty = opts?.quantity ?? 1
      if (variant && qty > stock) {
        toast.error(stock <= 0 ? "That size is out of stock" : `Only ${stock} left in stock`)
        return
      }
      try {
        await apiCart.addItem.mutateAsync({ variantId, quantity: qty })
        local.openCart()
        toast.success("Added to bag")
      } catch (err) {
        // Offline / API down → local cart
        if (err instanceof ApiError && err.status >= 500) {
          /* fall through */
        }
        if (err instanceof ApiError && err.status === 400) {
          toast.error(err.message || "Could not add to bag")
          return
        }
        if (!apiReachable || (err instanceof TypeError)) {
          local.addLine({
            productId: product.id,
            variantId,
            title: product.title,
            variantTitle: [opts?.color, opts?.size].filter(Boolean).join(" / "),
            brand: product.brand,
            image: product.images[0] || "",
            price: product.price,
            quantity: qty,
            handle: product.handle,
            size: opts?.size,
            color: opts?.color,
          })
          toast.success("Added to bag (offline)")
          return
        }
        toast.error(err instanceof Error ? err.message : "Could not add to bag")
      }
    },
    [apiCart.addItem, apiReachable, local],
  )

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      if (useApi) {
        try {
          if (quantity < 1) {
            await apiCart.removeItem.mutateAsync(variantId)
          } else {
            await apiCart.updateItem.mutateAsync({ itemId: variantId, quantity })
          }
          return
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not update bag")
          return
        }
      }
      local.updateQuantity(variantId, quantity)
    },
    [useApi, apiCart.removeItem, apiCart.updateItem, local],
  )

  const removeLine = useCallback(
    async (variantId: string) => {
      if (useApi) {
        try {
          await apiCart.removeItem.mutateAsync(variantId)
          return
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not remove item")
          return
        }
      }
      local.removeLine(variantId)
    },
    [useApi, apiCart.removeItem, local],
  )

  const clear = useCallback(async () => {
    if (useApi) {
      try {
        await apiCart.clearCart.mutateAsync()
      } catch {
        /* ignore */
      }
    }
    local.clear()
  }, [useApi, apiCart.clearCart, local])

  return {
    lines,
    count,
    subtotal,
    shipping,
    total: subtotal + shipping,
    isOpen: local.isOpen,
    openCart: local.openCart,
    closeCart: local.closeCart,
    addProduct,
    updateQuantity,
    removeLine,
    clear,
    apiReachable,
    isLoading: authLoading || (apiReachable && apiCart.isLoading && lines.length === 0),
    rawApiItems: apiCart.items as ApiCartItem[],
    cartItemId,
  }
}
