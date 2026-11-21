import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Placeholder color names imported from catalog — never show as a swatch. */
export function isPlaceholderColorName(name?: string | null) {
  return !name || /^(default|standard|one\s*color|n\/?a|none)$/i.test(String(name).trim())
}

export function visibleProductColors<T extends { name: string }>(colors?: T[] | null): T[] {
  return (colors || []).filter((c) => !isPlaceholderColorName(c.name))
}
