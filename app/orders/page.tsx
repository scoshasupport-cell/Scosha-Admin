"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { ApiOrder } from "@/lib/shop-api"

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [orders, setOrders] = useState<ApiOrder[]>([])

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/account")
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return
    ;(async () => {
      try {
        const res = await api.get<ApiOrder[] | { orders?: ApiOrder[] }>("/orders")
        const raw = res.data
        setOrders(Array.isArray(raw) ? raw : raw?.orders || [])
      } catch {
        setOrders([])
      }
    })()
  }, [isAuthenticated])

  if (loading || !isAuthenticated) {
    return <main className="store-container py-16 text-center text-sm text-muted">Loading…</main>
  }

  return (
    <main className="store-container py-10 md:py-16 space-y-6">
      <h1 className="text-[28px] font-bold">Orders</h1>
      {!orders.length ? (
        <p className="text-sm text-muted">
          No orders yet. <Link href="/shop" className="underline">Shop now</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const id = String(o.id ?? o._id)
            return (
              <Link
                key={id}
                href={`/orders/${encodeURIComponent(id)}`}
                className="flex items-center justify-between rounded-2xl border border-border-subtle bg-white p-4 text-sm hover:border-brand"
              >
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{o.status}</p>
                </div>
                <p className="font-bold">${Number(o.total).toFixed(2)}</p>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
