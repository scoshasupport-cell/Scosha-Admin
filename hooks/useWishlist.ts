"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { mapApiProducts, type ApiProduct } from "@/lib/shop-api"
import { useAuth } from "@/lib/auth"
import type { Product } from "@/types/ecommerce"

function unwrapProducts(data: unknown): Product[] {
  if (Array.isArray(data)) return mapApiProducts(data as ApiProduct[])
  if (data && typeof data === "object") {
    const obj = data as { products?: ApiProduct[]; items?: ApiProduct[] }
    if (Array.isArray(obj.products)) return mapApiProducts(obj.products)
    if (Array.isArray(obj.items)) return mapApiProducts(obj.items)
  }
  return []
}

export function useWishlistQuery(enabled?: boolean) {
  const { isAuthenticated, loading } = useAuth()
  const isBrowser = typeof window !== "undefined"
  return useQuery({
    queryKey: ["wishlist"],
    enabled: enabled ?? (isBrowser && !loading && isAuthenticated),
    queryFn: async () => {
      const res = await api.get<unknown>("/wishlist")
      return unwrapProducts(res.data)
    },
  })
}

export function useWishlistMutations() {
  const queryClient = useQueryClient()

  const add = useMutation({
    mutationFn: async (productId: string) => {
      await api.post(`/wishlist/${productId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  })

  const remove = useMutation({
    mutationFn: async (productId: string) => {
      await api.del(`/wishlist/${productId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  })

  const moveToCart = useMutation({
    mutationFn: async (productId: string) => {
      await api.post(`/wishlist/${productId}/move-to-cart`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  return { add, remove, moveToCart }
}
