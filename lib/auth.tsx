"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import { api, clearTokens, rotateGuestSessionId } from "@/lib/api"
import { syncWishlistAfterAuth } from "@/lib/pending-wishlist"
import { useCart, useWishlist } from "@/lib/store"
import type { ApiUser } from "@/lib/shop-api"

export type AuthUser = ApiUser

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (input: { email?: string; phone?: string; password: string }) => Promise<AuthUser>
  loginWithGoogle: (accessToken: string) => Promise<AuthUser>
  register: (input: {
    name: string
    email?: string
    phone?: string
    password: string
    gender?: "women" | "men" | "unisex"
    preferredSize?: string
    address?: {
      line1: string
      line2?: string
      city: string
      state: string
      zip: string
      country?: string
    }
  }) => Promise<{
    email?: string
    phone?: string
    message: string
    devOtp?: string
    user?: AuthUser
  }>
  verifyEmail: (email: string, otp: string) => Promise<AuthUser>
  resendOtp: (email: string) => Promise<{ message?: string; devOtp?: string }>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (input: {
    email: string
    token: string
    password: string
  }) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function mergeCartAfterLogin(localLines: { variantId: string; quantity: number }[]) {
  try {
    await api.post("/cart/merge")
  } catch {
    /* guest cart may not exist */
  }

  let hasApiItems = false
  try {
    const cart = await api.get<{ items?: unknown[] }>("/cart")
    hasApiItems = Array.isArray(cart.data?.items) && cart.data.items.length > 0
  } catch {
    /* ignore */
  }

  // Only hydrate from local storage when the server cart is still empty after merge.
  if (!hasApiItems) {
    for (const line of localLines) {
      const variantId = Number(line.variantId)
      const quantity = Number(line.quantity) || 1
      if (!Number.isFinite(variantId) || variantId <= 0 || quantity < 1) continue
      try {
        await api.post("/cart/items", { variantId, quantity })
      } catch {
        /* stock / missing variant — skip */
      }
    }
  }

  // Start a fresh anonymous session id so the next guest cart cannot reuse the merged one
  rotateGuestSessionId()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const resetLocalCartForOwner = useCart((s) => s.resetForOwner)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    clearTokens()
    try {
      const res = await api.get<AuthUser>("/auth/me")
      setUser(res.data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      clearTokens()
      try {
        const res = await api.get<AuthUser>("/auth/me")
        if (!cancelled) setUser(res.data)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Keep offline/local cart isolated per account (and guest)
  useEffect(() => {
    if (loading) return
    const ownerKey = user?.id != null ? `user:${user.id}` : "guest"
    resetLocalCartForOwner(ownerKey)
  }, [loading, user?.id, resetLocalCartForOwner])

  const attachGuestWishlist = useCallback(async () => {
    const synced = await syncWishlistAfterAuth()
    if (synced) useWishlist.getState().clear()
    await queryClient.invalidateQueries({ queryKey: ["wishlist"] })
  }, [queryClient])

  const adoptCartAfterAuth = useCallback(
    async (authUser: AuthUser) => {
      const userId = authUser.id ?? authUser._id
      const localLines = useCart.getState().lines.map((l) => ({
        variantId: String(l.variantId),
        quantity: l.quantity,
      }))
      await mergeCartAfterLogin(localLines)
      await queryClient.removeQueries({ queryKey: ["cart"] })
      resetLocalCartForOwner(`user:${userId ?? "unknown"}`)
      await attachGuestWishlist()
    },
    [attachGuestWishlist, queryClient, resetLocalCartForOwner],
  )

  const login = useCallback(
    async (input: { email?: string; phone?: string; password: string }) => {
      const res = await api.post<{ user: AuthUser }>("/auth/login", input, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user)
      setUser(res.data.user)
      return res.data.user
    },
    [adoptCartAfterAuth],
  )

  const loginWithGoogle = useCallback(
    async (accessToken: string) => {
      const res = await api.post<{ user: AuthUser }>("/auth/google", { accessToken }, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user)
      setUser(res.data.user)
      return res.data.user
    },
    [adoptCartAfterAuth],
  )

  const register = useCallback(
    async (input: {
      name: string
      email?: string
      phone?: string
      password: string
      gender?: "women" | "men" | "unisex"
      preferredSize?: string
      address?: {
        line1: string
        line2?: string
        city: string
        state: string
        zip: string
        country?: string
      }
    }) => {
      const res = await api.post<{
        email?: string
        phone?: string
        message: string
        devOtp?: string
        user?: AuthUser
      }>("/auth/register", input, { skipAuth: true })
      if (res.data.user) {
        await adoptCartAfterAuth(res.data.user)
        setUser(res.data.user)
      }
      return res.data
    },
    [adoptCartAfterAuth],
  )

  const verifyEmail = useCallback(
    async (email: string, otp: string) => {
      const res = await api.post<{ user: AuthUser }>("/auth/verify-email", { email, otp }, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user)
      setUser(res.data.user)
      return res.data.user
    },
    [adoptCartAfterAuth],
  )

  const resendOtp = useCallback(async (email: string) => {
    const res = await api.post<{ message?: string; devOtp?: string }>(
      "/auth/resend-otp",
      { email },
      { skipAuth: true },
    )
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout")
    } catch {
      /* ignore */
    }
    clearTokens()
    setUser(null)
    rotateGuestSessionId()
    await queryClient.removeQueries({ queryKey: ["cart"] })
    resetLocalCartForOwner("guest")
  }, [queryClient, resetLocalCartForOwner])

  const forgotPassword = useCallback(async (email: string) => {
    const res = await api.post<{ message?: string; resetToken?: string }>(
      "/auth/forgot-password",
      { email },
      { skipAuth: true },
    )
    return res.data.resetToken || res.message || "Check your email"
  }, [])

  const resetPassword = useCallback(
    async (input: { email: string; token: string; password: string }) => {
      await api.post("/auth/reset-password", input, { skipAuth: true })
    },
    [],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendOtp,
      logout,
      forgotPassword,
      resetPassword,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendOtp,
      logout,
      forgotPassword,
      resetPassword,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
