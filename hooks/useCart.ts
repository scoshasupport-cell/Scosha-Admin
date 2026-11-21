"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ApiCart } from "@/lib/shop-api"
import { useAuth } from "@/lib/auth"

export const cartKeys = {
  all: ["cart"] as const,
  /** Owner-scoped key — prevents React Query from leaking carts across accounts. */
  owner: (ownerKey: string) => ["cart", ownerKey] as const,
};

function useCartOwnerKey() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user?.id != null ? `user:${user.id}` : "guest"
}

export function useApiCart(enabled = true) {
  const ownerKey = useCartOwnerKey()
  return useQuery({
    queryKey: cartKeys.owner(ownerKey ?? "pending"),
    enabled: enabled && Boolean(ownerKey),
    queryFn: async () => {
      const res = await api.get<ApiCart>("/cart")
      return res.data
    },
    staleTime: 15_000,
  })
}

export function useCartMutations() {
  const queryClient = useQueryClient()
  const ownerKey = useCartOwnerKey()

  const setCart = (data: ApiCart) => {
    if (ownerKey) {
      queryClient.setQueryData(cartKeys.owner(ownerKey), data)
    }
  }

  const addItem = useMutation({
    mutationFn: async (input: { variantId: string; quantity?: number }) => {
      const res = await api.post<ApiCart>("/cart/items", {
        variantId: input.variantId,
        quantity: input.quantity ?? 1,
      })
      return res.data
    },
    onSuccess: setCart,
  })

  const updateItem = useMutation({
    mutationFn: async (input: { itemId: string; quantity: number }) => {
      const res = await api.patch<ApiCart>(`/cart/items/${input.itemId}`, {
        quantity: input.quantity,
      })
      return res.data
    },
    onSuccess: setCart,
  })

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await api.del<ApiCart>(`/cart/items/${itemId}`)
      return res.data
    },
    onSuccess: setCart,
  })

  const clearCart = useMutation({
    mutationFn: async () => {
      const res = await api.del<ApiCart>("/cart")
      return res.data
    },
    onSuccess: setCart,
  })

  return { addItem, updateItem, removeItem, clearCart }
}

/** Prefer live API cart (guest cookie/header or auth). */
export function useActiveCart() {
  const { loading } = useAuth()
  const isBrowser = typeof window !== "undefined"
  const cartQuery = useApiCart(isBrowser && !loading)
  const mutations = useCartMutations()

  return {
    ...cartQuery,
    ...mutations,
    count: cartQuery.data?.itemCount ?? 0,
    subtotal: cartQuery.data?.subtotal ?? 0,
    items: cartQuery.data?.items ?? [],
    stockAdjusted: Boolean(cartQuery.data?.stockAdjusted),
    stockMessages: cartQuery.data?.stockMessages ?? [],
  }
}
