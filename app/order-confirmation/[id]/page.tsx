"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { ApiOrder } from "@/lib/shop-api"

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { refreshUser } = useAuth()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [vipPending, setVipPending] = useState(false)

  useEffect(() => {
    setVipPending(sessionStorage.getItem("scosha_vip_unlocked") === "1")
  }, [])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const res = await api.get<ApiOrder>(`/orders/${encodeURIComponent(id)}`)
        setOrder(res.data)
        await refreshUser()
      } catch {
        setOrder(null)
      }
    })()
  }, [id, refreshUser])

  return (
    <main className="store-container py-16 text-center space-y-4">
      <h1 className="text-[28px] font-bold">Thank you</h1>
      <p className="text-sm text-muted">
        Your Cash on Delivery order
        {order?.orderNumber ? (
          <>
            {" "}
            <strong className="text-primary-text">{order.orderNumber}</strong>
          </>
        ) : null}{" "}
        is confirmed.
      </p>
      {order && (
        <p className="text-sm">
          Total: <strong>${Number(order.total).toFixed(2)}</strong>
        </p>
      )}
      {vipPending && (
        <p className="mx-auto max-w-md rounded-2xl border border-[#7A1F2B]/20 bg-[#7A1F2B]/5 px-4 py-3 text-sm text-[#5C1520]">
          You unlocked <strong>VIP</strong> — check the congratulations message for your benefits.
        </p>
      )}
      <div className="flex justify-center gap-3 pt-4">
        <Link href="/orders" className="btn-primary px-6 py-3 text-xs">
          View orders
        </Link>
        <Link href="/shop" className="btn-secondary px-6 py-3 text-xs">
          Continue shopping
        </Link>
      </div>
    </main>
  )
}
