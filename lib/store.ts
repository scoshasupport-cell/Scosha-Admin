"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { CartLine, AISkinScanResult, Product } from "@/types/ecommerce"

/* ----------------------------- Cart Store ----------------------------- */

interface CartState {
  lines: CartLine[]
  isOpen: boolean
  /** Tracks which auth/guest owner the persisted lines belong to */
  ownerKey: string
  addLine: (line: CartLine) => void
  removeLine: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  /** Drop lines when switching between users / guest so offline cart never leaks */
  resetForOwner: (ownerKey: string) => void
  openCart: () => void
  closeCart: () => void
  subtotal: () => number
  count: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      ownerKey: "guest",
      addLine: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId)
          if (existing) {
            return {
              isOpen: true,
              lines: state.lines.map((l) =>
                l.variantId === line.variantId ? { ...l, quantity: l.quantity + line.quantity } : l,
              ),
            }
          }
          return { isOpen: true, lines: [...state.lines, line] }
        }),
      removeLine: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(0, quantity) } : l))
            .filter((l) => l.quantity > 0),
        })),
      clear: () => set({ lines: [] }),
      resetForOwner: (ownerKey) => {
        const current = get().ownerKey
        if (current === ownerKey) return
        set({ ownerKey, lines: [], isOpen: false })
      },
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      subtotal: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: "scosha-cart-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines, ownerKey: state.ownerKey }),
    },
  ),
)

/* --------------------------- Currency Store --------------------------- */

interface CurrencyState {
  code: string
  setCode: (code: string) => void
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      code: "USD",
      setCode: (code) => set({ code }),
    }),
    { name: "scosha-currency" },
  ),
)

/* --------------------------- Wishlist Store --------------------------- */

interface WishlistState {
  ids: string[]
  toggle: (id: string) => void
  has: (id: string) => boolean
  clear: () => void
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id) ? state.ids.filter((x) => x !== id) : [...state.ids, id],
        })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: "scosha-wishlist" },
  ),
)

/* --------------------------- Quick View Store ------------------------- */

interface QuickViewState {
  product: Product | null
  open: (product: Product) => void
  close: () => void
}

export const useQuickView = create<QuickViewState>((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}))

/* ---------------------------- AI Scan Store --------------------------- */

type ScanStatus = "idle" | "camera" | "analyzing" | "result"

interface ScanState {
  isOpen: boolean
  status: ScanStatus
  result: AISkinScanResult | null
  open: () => void
  close: () => void
  setStatus: (status: ScanStatus) => void
  setResult: (result: AISkinScanResult) => void
  reset: () => void
}

export const useSkinScan = create<ScanState>((set) => ({
  isOpen: false,
  status: "idle",
  result: null,
  open: () => set({ isOpen: true, status: "idle" }),
  close: () => set({ isOpen: false }),
  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result, status: "result" }),
  reset: () => set({ status: "idle", result: null }),
}))
