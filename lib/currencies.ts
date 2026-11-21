import type { Currency } from "@/types/ecommerce"

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", rate: 1, label: "United States", flag: "🇺🇸" },
  { code: "AED", symbol: "د.إ", rate: 3.67, label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SAR", symbol: "ر.س", rate: 3.75, label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "LBP", symbol: "ل.ل", rate: 89500, label: "Lebanon", flag: "🇱🇧" },
  { code: "EUR", symbol: "€", rate: 0.92, label: "Europe", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", rate: 0.79, label: "United Kingdom", flag: "🇬🇧" },
  { code: "KWD", symbol: "د.ك", rate: 0.31, label: "Kuwait", flag: "🇰🇼" },
  { code: "QAR", symbol: "ر.ق", rate: 3.64, label: "Qatar", flag: "🇶🇦" },
  { code: "EGP", symbol: "E£", rate: 48.5, label: "Egypt", flag: "🇪🇬" },
  { code: "CAD", symbol: "C$", rate: 1.36, label: "Canada", flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", rate: 1.52, label: "Australia", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", rate: 151, label: "Japan", flag: "🇯🇵" },
]

const NO_DECIMAL = new Set(["LBP", "JPY", "EGP"])

export function formatPrice(usd: number, currency: Currency): string {
  const value = usd * currency.rate
  const decimals = NO_DECIMAL.has(currency.code) ? 0 : 2
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${currency.symbol}${formatted}`
}
