"use client"

import { useEffect, useState } from "react"

/** False on the server and the first client render so persisted local state cannot hydrate-mismatch. */
export function useHasMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
