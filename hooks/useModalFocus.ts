"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type StackEntry = {
  token: number
  fromPop: boolean
  /** Set when a link inside the modal starts a route change — skip history.back(). */
  skipHistoryBack: boolean
  close: () => void
}

const stack: StackEntry[] = []
let nextToken = 0
let ignoreNextPop = false
let listening = false
let lockCount = 0
let savedScroll = 0

function onPopState() {
  if (ignoreNextPop) {
    ignoreNextPop = false
    return
  }
  const top = stack[stack.length - 1]
  if (!top) return
  top.fromPop = true
  top.close()
}

function ensureListener() {
  if (listening || typeof window === "undefined") return
  listening = true
  window.addEventListener("popstate", onPopState)
}

function lockBody() {
  lockCount += 1
  if (lockCount !== 1) return
  savedScroll = window.scrollY
  const body = document.body
  body.style.overflow = "hidden"
  body.style.position = "fixed"
  body.style.top = `-${savedScroll}px`
  body.style.left = "0"
  body.style.right = "0"
  body.style.width = "100%"
}

function unlockBody() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount !== 0) return
  const body = document.body
  body.style.overflow = ""
  body.style.position = ""
  body.style.top = ""
  body.style.left = ""
  body.style.right = ""
  body.style.width = ""
  window.scrollTo(0, savedScroll)
}

function inertOutside(node: HTMLElement) {
  const changed: HTMLElement[] = []
  let current: HTMLElement | null = node
  while (current) {
    const parent: HTMLElement | null = current.parentElement
    if (!parent) break
    for (const sibling of Array.from(parent.children)) {
      if (sibling === current || !(sibling instanceof HTMLElement)) continue
      if (sibling.hasAttribute("data-modal-inert") || sibling.hasAttribute("inert")) continue
      sibling.setAttribute("inert", "")
      sibling.setAttribute("data-modal-inert", "")
      changed.push(sibling)
    }
    if (parent === document.body) break
    current = parent
  }
  return changed
}

/**
 * While `open` is true: the page behind the popup cannot scroll or take focus,
 * Tab stays inside `ref`, and the browser/device back button closes the popup.
 */
export function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const node = ref.current
    if (!node) return
    const dialog: HTMLDivElement = node

    ensureListener()
    lockBody()
    const inerted = inertOutside(dialog)
    const previous = document.activeElement as HTMLElement | null

    dialog.setAttribute("role", dialog.getAttribute("role") || "dialog")
    dialog.setAttribute("aria-modal", "true")
    if (!dialog.hasAttribute("tabindex")) dialog.tabIndex = -1

    const entry: StackEntry = {
      token: ++nextToken,
      fromPop: false,
      skipHistoryBack: false,
      close: () => onCloseRef.current(),
    }
    stack.push(entry)
    const urlWhenOpen = window.location.href
    window.history.pushState({ scoshaModal: entry.token }, "")

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.tabIndex !== -1 && !el.hasAttribute("disabled"),
      )

    window.setTimeout(() => {
      const first = focusables()[0]
      ;(first || dialog).focus()
    }, 0)

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== entry) return
      if (e.key === "Escape") {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab") return
      const items = focusables()
      if (!items.length) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    function onFocusIn(e: FocusEvent) {
      if (stack[stack.length - 1] !== entry) return
      if (e.target instanceof Node && dialog.contains(e.target)) return
      e.stopPropagation()
      const first = focusables()[0]
      ;(first || dialog).focus()
    }

    function blockScroll(e: Event) {
      if (e.target instanceof Node && dialog.contains(e.target)) return
      e.preventDefault()
    }

    /** Link/nav taps close the modal then navigate — history.back() would undo that nav. */
    function onDialogClick(e: MouseEvent) {
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest("a[href], [data-nav-away]")) {
        entry.skipHistoryBack = true
      }
    }

    document.addEventListener("keydown", onKey)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("touchmove", blockScroll, { passive: false })
    document.addEventListener("wheel", blockScroll, { passive: false })
    dialog.addEventListener("click", onDialogClick, true)

    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("touchmove", blockScroll)
      document.removeEventListener("wheel", blockScroll)
      dialog.removeEventListener("click", onDialogClick, true)
      const index = stack.indexOf(entry)
      if (index >= 0) stack.splice(index, 1)
      inerted.forEach((el) => {
        el.removeAttribute("inert")
        el.removeAttribute("data-modal-inert")
      })
      unlockBody()
      const navigatedAway = window.location.href !== urlWhenOpen
      if (!entry.fromPop && window.history.state?.scoshaModal === entry.token) {
        if (entry.skipHistoryBack || navigatedAway) {
          // Drop modal marker without rewinding an in-flight route change.
          // Never history.back() here — it races with location.assign/router and
          // returns the user to the previous page (e.g. PDP after Proceed to Checkout).
          window.history.replaceState(null, "")
        } else {
          ignoreNextPop = true
          window.history.back()
        }
      }
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [open])

  return ref
}
