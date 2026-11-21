"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useWishlist as useLocalWishlist } from "@/lib/store"
import { useAuth } from "@/lib/auth"
import { useWishlistMutations, useWishlistQuery } from "@/hooks/useWishlist"
import { rememberPendingSave, syncWishlistAfterAuth } from "@/lib/pending-wishlist"
import type { Product } from "@/types/ecommerce"
import { ApiError } from "@/lib/api"

/**
 * Signed-in customers use the account wishlist. Guests are sent to sign in or register,
 * and any item they tapped is saved onto the account once they are in.
 */
export function useShopWishlist() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const local = useLocalWishlist()
  const apiQuery = useWishlistQuery(isAuthenticated)
  const mutations = useWishlistMutations()
  const syncingGuestSaves = useRef(false)

  useEffect(() => {
    if (authLoading || !isAuthenticated || local.ids.length === 0 || syncingGuestSaves.current) return
    syncingGuestSaves.current = true
    void (async () => {
      try {
        const synced = await syncWishlistAfterAuth()
        if (synced) local.clear()
        await queryClient.invalidateQueries({ queryKey: ["wishlist"] })
      } finally {
        syncingGuestSaves.current = false
      }
    })()
  }, [authLoading, isAuthenticated, local, queryClient])

  const products: Product[] = useMemo(() => {
    if (isAuthenticated && apiQuery.data) return apiQuery.data
    return []
  }, [isAuthenticated, apiQuery.data])

  const ids = useMemo(() => {
    if (isAuthenticated && apiQuery.data) return apiQuery.data.map((p) => p.id)
    return local.ids
  }, [isAuthenticated, apiQuery.data, local.ids])

  const count = ids.length

  const isWished = useCallback((productId: string) => ids.includes(productId), [ids])

  const toggle = useCallback(
    async (productId: string) => {
      if (authLoading) return
      if (!isAuthenticated) {
        rememberPendingSave(productId)
        if (!local.ids.includes(productId)) local.toggle(productId)
        toast.message("Sign in or register to save this item")
        router.push(
          `/account?mode=login&redirect=${encodeURIComponent("/wishlist")}&save=${encodeURIComponent(productId)}`,
        )
        return
      }
      try {
        if (ids.includes(productId)) {
          await mutations.remove.mutateAsync(productId)
          toast.message("Removed from wishlist")
        } else {
          await mutations.add.mutateAsync(productId)
          toast.success("Saved to wishlist")
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          rememberPendingSave(productId)
          if (!local.ids.includes(productId)) local.toggle(productId)
          toast.message("Sign in or register to save this item")
          router.push(
            `/account?mode=login&redirect=${encodeURIComponent("/wishlist")}&save=${encodeURIComponent(productId)}`,
          )
          return
        }
        toast.error(err instanceof Error ? err.message : "Wishlist update failed")
      }
    },
    [authLoading, isAuthenticated, ids, local, mutations.add, mutations.remove, router],
  )

  return {
    products,
    ids,
    count,
    isAuthenticated,
    isWished,
    toggle,
    isLoading: authLoading || (isAuthenticated && apiQuery.isLoading),
    moveToCart: mutations.moveToCart,
  }
}
