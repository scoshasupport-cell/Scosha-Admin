"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useSearch } from "@/hooks/useCatalog"
import { Price } from "@/components/price"

export function PredictiveSearch({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [debounced, setDebounced] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data } = useSearch(debounced.length >= 2 ? debounced : "", 6)
  const results = data?.products ?? []

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next = query.trim()
    if (!next) return
    setOpen(false)
    onNavigate?.()
    router.push(`/shop?q=${encodeURIComponent(next)}`)
  }

  function handleClear() {
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={className}>
      <form onSubmit={submit} className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search clothes, jackets, jeans, brands..."
          className="h-10.5 w-full rounded-xl border border-border-subtle bg-surface pl-4 pr-16 text-xs font-medium text-primary-text outline-none transition placeholder:text-muted focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 text-[11px] font-medium text-muted transition hover:text-brand"
          >
            Clear
          </button>
        )}

        <button
          type="submit"
          aria-label="Search"
          className="absolute right-3.5 text-subtext hover:text-brand transition-colors"
        >
          <Search size={16} strokeWidth={2} />
        </button>
      </form>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-xl shadow-brand/10">
          <div className="p-2.5">
            <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
              Matching Items ({results.length})
            </p>
            <ul>
              {results.map((product) => (
                <li key={product.id} className="border-b border-surface-2 last:border-0">
                  <Link
                    href={`/product/${product.handle}`}
                    onClick={() => {
                      setOpen(false)
                      onNavigate?.()
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-light"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      <Image
                        src={product.images[0] || "/placeholder.svg"}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-primary-text">
                        {product.title}
                      </p>
                      <p className="text-[11px] text-muted">{product.brand}</p>
                    </div>
                    <Price amount={product.price} className="text-[13px] font-bold" />
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={submit}
              className="mt-1 w-full rounded-xl py-2.5 text-[12px] font-bold uppercase tracking-wider text-brand hover:bg-brand-light"
            >
              View all results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
