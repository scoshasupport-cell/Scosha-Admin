"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { withApiId, type ApiAddress } from "@/lib/shop-api"
import { useAuth } from "@/lib/auth"

export type AddressInput = {
  name: string
  phone: string
  email?: string
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country?: string
  isDefault?: boolean
}

export function useAddresses(enabled?: boolean) {
  const { isAuthenticated, loading } = useAuth()
  return useQuery({
    queryKey: ["addresses"],
    enabled: enabled ?? (!loading && isAuthenticated),
    queryFn: async () => {
      const res = await api.get<ApiAddress[]>("/addresses")
      return (Array.isArray(res.data) ? res.data : []).map(withApiId)
    },
  })
}

export function useAddressMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["addresses"] })

  const create = useMutation({
    mutationFn: async (input: AddressInput) => {
      const res = await api.post<ApiAddress>("/addresses", {
        country: "US",
        ...input,
      })
      return withApiId(res.data)
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: AddressInput & { id: string }) => {
      const res = await api.put<ApiAddress>(`/addresses/${id}`, input)
      return withApiId(res.data)
    },
    onSuccess: invalidate,
  })

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiAddress>(`/addresses/${id}/default`)
      return withApiId(res.data)
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/addresses/${id}`)
    },
    onSuccess: invalidate,
  })

  return { create, update, setDefault, remove }
}
