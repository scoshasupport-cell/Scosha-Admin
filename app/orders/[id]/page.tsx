"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { ApiOrder } from "@/lib/shop-api"

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [order, setOrder] = useState<ApiOrder | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/account")
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated || !params?.id) return
    ;(async () => {
      try {
        const res = await api.get<ApiOrder>(`/orders/${encodeURIComponent(params.id)}`)
        setOrder(res.data)
      } catch {
        setOrder(null)
      }
    })()
  }, [isAuthenticated, params?.id])

  if (loading || !isAuthenticated) {
    return <main className="store-container py-16 text-center text-sm text-muted">Loading…</main>
  }

  if (!order) {
    return (
      <main className="store-container py-16 text-center">
        <p>Order not found.</p>
        <Link href="/orders" className="underline text-sm">
          Back
        </Link>
      </main>
    )
  }

  return (
    <main className="store-container py-10 md:py-16 space-y-6 max-w-2xl">
      <Link href="/orders" className="text-sm underline text-muted">
        ← Orders
      </Link>
      <h1 className="text-[28px] font-bold">{order.orderNumber}</h1>
      <p className="text-sm">
        Status: <strong>{order.status}</strong> · Payment: {order.paymentMethod || "COD"}
      </p>
      <div className="space-y-2 rounded-2xl border border-border-subtle bg-white p-4">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm gap-3">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>${Number(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>${Number(order.total).toFixed(2)}</span>
        </div>
      </div>
    </main>
  )
}
