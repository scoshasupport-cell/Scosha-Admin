"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X } from "lucide-react"
import type { Product } from "@/types/ecommerce"
import { Price } from "@/components/price"
import { useModalFocus } from "@/hooks/useModalFocus"

export function CompareBar({
  products,
  onRemove,
  onClear,
}: {
  products: Product[]
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const dialogRef = useModalFocus(open, () => setOpen(false))
  const slots = Array.from({ length: 4 }, (_, index) => products[index] ?? null)

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e5e5] bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="store-container flex flex-wrap items-center gap-4">
          <p className="text-[15px] font-bold">Compare ({products.length}/4)</p>
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {slots.map((product, index) =>
              product ? (
                <div key={product.id} className="relative flex h-14 w-14 items-center justify-center border border-[#e5e5e5] bg-[#f7f7f7]">
                  <Image src={product.images[0] || "/placeholder.svg"} alt={product.title} width={48} height={48} className="object-contain" />
                  <button
                    type="button"
                    onClick={() => onRemove(product.id)}
                    aria-label={`Remove ${product.title} from compare`}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div key={`empty-${index}`} className="h-14 w-14 border border-dashed border-[#d0d0d0] bg-[#fafafa]" />
              ),
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {products.length >= 2 ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="h-11 rounded-[10px] bg-brand px-5 text-[13px] font-semibold uppercase text-white hover:bg-brand-dark"
              >
                Compare
              </button>
            ) : (
              <span className="text-[13px] text-[#666]">Select 2–4 products</span>
            )}
            <button type="button" onClick={onClear} className="text-[13px] underline underline-offset-4">
              Clear
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 outline-none sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[10px] bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[22px] font-bold">Compare products</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close compare">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {products.map((product) => (
                <div key={product.id} className="text-center">
                  <div className="relative mx-auto mb-3 aspect-square w-full max-w-[160px]">
                    <Image src={product.images[0] || "/placeholder.svg"} alt={product.title} fill className="object-contain" />
                  </div>
                  <p className="text-[11px] font-bold uppercase text-black/60">{product.brand}</p>
                  <p className="mt-1 min-h-10 text-[14px] font-semibold">{product.title}</p>
                  <div className="mt-2">
                    <Price amount={product.price} compareAt={product.compareAtPrice} className="text-[15px] font-bold" />
                  </div>
                  <Link href={`/product/${product.handle}`} className="mt-3 inline-block text-[13px] underline underline-offset-4">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
