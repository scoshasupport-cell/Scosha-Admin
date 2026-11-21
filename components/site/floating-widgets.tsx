"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { useSkinScan } from "@/lib/store"

const ICON_SRC = "/AiFloating%20icon.jpeg"
const STORAGE_KEY = "scosha-ai-float"
const DRAG_PX = 6

type Point = { x: number; y: number }
type Saved = { hidden?: boolean; nx?: number; ny?: number }

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Saved
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeSaved(next: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode */
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

export function FloatingWidgets() {
  const openScan = useSkinScan((state) => state.open)
  const isOpen = useSkinScan((state) => state.isOpen)
  const pathname = usePathname() || "/"
  const rootRef = useRef<HTMLDivElement>(null)
  const posRef = useRef<Point | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const [hidden, setHidden] = useState(false)
  const [pos, setPos] = useState<Point | null>(null)
  const [dragging, setDragging] = useState(false)

  const place = useCallback((x: number, y: number) => {
    const el = rootRef.current
    const w = el?.offsetWidth ?? 96
    const h = el?.offsetHeight ?? 110
    const next = {
      x: clamp(x, 8, Math.max(8, window.innerWidth - w - 8)),
      y: clamp(y, 8, Math.max(8, window.innerHeight - h - 8)),
    }
    posRef.current = next
    setPos(next)
    return next
  }, [])

  useEffect(() => {
    if (pathname.startsWith("/product/")) setHidden(false)
  }, [pathname])

  useEffect(() => {
    const saved = readSaved()
    if (typeof saved.nx === "number" && typeof saved.ny === "number") {
      place(saved.nx * window.innerWidth, saved.ny * window.innerHeight)
    }
  }, [place])

  useEffect(() => {
    function onResize() {
      const current = posRef.current
      if (!current) return
      place(current.x, current.y)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [place])

  function persist(next: Saved) {
    writeSaved(next)
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_PX) return
    drag.moved = true
    setDragging(true)
    place(drag.originX + dx, drag.originY + dy)
  }

  function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!drag.moved) {
      setDragging(false)
      return
    }
    suppressClickRef.current = true
    setDragging(false)
    const current = posRef.current
    if (!current) return
    persist({
      hidden: false,
      nx: current.x / window.innerWidth,
      ny: current.y / window.innerHeight,
    })
  }

  function onClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    openScan()
  }

  function hide(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    setHidden(true)
  }

  if (hidden || isOpen) return null

  return (
    <div
      ref={rootRef}
      className={
        pos
          ? "pointer-events-none fixed z-[90]"
          : "pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-[max(0.65rem,env(safe-area-inset-right))] z-[90] sm:bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:right-4 lg:bottom-6 lg:right-6"
      }
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={onClick}
        aria-label="Open AI scan. Drag to move."
        className={`pointer-events-auto relative block touch-none select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        } ${dragging ? "" : "animate-floatY"}`}
      >
        <span className="relative block h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-[0_10px_22px_rgba(0,0,0,0.22)] ring-2 ring-white sm:h-20 sm:w-20 lg:h-28 lg:w-28">
          <Image
            src={ICON_SRC}
            alt=""
            fill
            sizes="(min-width: 1024px) 112px, (min-width: 640px) 80px, 56px"
            className="pointer-events-none object-cover"
            priority
            draggable={false}
          />
        </span>
        <span className="pointer-events-none absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-black px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] sm:bottom-1 sm:px-2.5 sm:text-[10px] lg:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
          AI Scan
        </span>
      </button>
      <button
        type="button"
        onClick={hide}
        aria-label="Remove AI scan button"
        className="pointer-events-auto absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-primary-text shadow-md"
      >
        <X size={13} strokeWidth={2.4} />
      </button>
    </div>
  )
}
