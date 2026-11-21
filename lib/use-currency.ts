"use client"

export function useCurrency() {
  const format = (usd: number) => {
    return `$${usd.toFixed(2)}`
  }

  return {
    currency: { code: "USD", symbol: "$", rate: 1, label: "United States (USD $)", flag: "🇺🇸" },
    format,
  }
}
