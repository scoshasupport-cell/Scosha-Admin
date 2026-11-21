"use client"

import { ApiError, api } from "@/lib/api"

const ID_KEY = "scosha-wishlist-pending"
const NEXT_KEY = "scosha-wishlist-next"

export function rememberPendingSave(productId: string, next = "/wishlist") {
  if (typeof window === "undefined") return
  sessionStorage.setItem(ID_KEY, productId)
  sessionStorage.setItem(NEXT_KEY, next)
}

export function consumeWishlistRedirect(): string | null {
  if (typeof window === "undefined") return null
  const next = sessionStorage.getItem(NEXT_KEY)
  sessionStorage.removeItem(NEXT_KEY)
  return next
}

function readStoredIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("scosha-wishlist")
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { ids?: unknown } }
    const ids = parsed.state?.ids
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string" && id.length > 0)
      : []
  } catch {
    return []
  }
}

/** Copy guest saves onto the signed-in account. Keeps them locally if the request cannot reach the server. */
export async function syncWishlistAfterAuth(): Promise<boolean> {
  if (typeof window === "undefined") return false
  const pending = sessionStorage.getItem(ID_KEY)
  sessionStorage.removeItem(ID_KEY)
  const ids = [...new Set([...(pending ? [pending] : []), ...readStoredIds()])]
  if (!ids.length) return false

  let unreachable = false
  for (const id of ids) {
    try {
      await api.post(`/wishlist/${encodeURIComponent(id)}`)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 0 || status >= 500) unreachable = true
    }
  }
  return !unreachable
}
