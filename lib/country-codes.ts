export type CountryDial = {
  iso: string
  name: string
  dial: string
  flag: string
}

/** Common dial codes — US first as default storefront market. */
export const COUNTRY_DIALS: CountryDial[] = [
  { iso: "US", name: "United States", dial: "1", flag: "🇺🇸" },
  { iso: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
  { iso: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧" },
  { iso: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { iso: "DE", name: "Germany", dial: "49", flag: "🇩🇪" },
  { iso: "IT", name: "Italy", dial: "39", flag: "🇮🇹" },
  { iso: "ES", name: "Spain", dial: "34", flag: "🇪🇸" },
  { iso: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { iso: "NL", name: "Netherlands", dial: "31", flag: "🇳🇱" },
  { iso: "BE", name: "Belgium", dial: "32", flag: "🇧🇪" },
  { iso: "CH", name: "Switzerland", dial: "41", flag: "🇨🇭" },
  { iso: "AT", name: "Austria", dial: "43", flag: "🇦🇹" },
  { iso: "IE", name: "Ireland", dial: "353", flag: "🇮🇪" },
  { iso: "SE", name: "Sweden", dial: "46", flag: "🇸🇪" },
  { iso: "NO", name: "Norway", dial: "47", flag: "🇳🇴" },
  { iso: "DK", name: "Denmark", dial: "45", flag: "🇩🇰" },
  { iso: "PL", name: "Poland", dial: "48", flag: "🇵🇱" },
  { iso: "RO", name: "Romania", dial: "40", flag: "🇷🇴" },
  { iso: "GR", name: "Greece", dial: "30", flag: "🇬🇷" },
  { iso: "TR", name: "Turkey", dial: "90", flag: "🇹🇷" },
  { iso: "AE", name: "United Arab Emirates", dial: "971", flag: "🇦🇪" },
  { iso: "SA", name: "Saudi Arabia", dial: "966", flag: "🇸🇦" },
  { iso: "QA", name: "Qatar", dial: "974", flag: "🇶🇦" },
  { iso: "KW", name: "Kuwait", dial: "965", flag: "🇰🇼" },
  { iso: "BH", name: "Bahrain", dial: "973", flag: "🇧🇭" },
  { iso: "OM", name: "Oman", dial: "968", flag: "🇴🇲" },
  { iso: "EG", name: "Egypt", dial: "20", flag: "🇪🇬" },
  { iso: "MA", name: "Morocco", dial: "212", flag: "🇲🇦" },
  { iso: "TN", name: "Tunisia", dial: "216", flag: "🇹🇳" },
  { iso: "DZ", name: "Algeria", dial: "213", flag: "🇩🇿" },
  { iso: "ZA", name: "South Africa", dial: "27", flag: "🇿🇦" },
  { iso: "NG", name: "Nigeria", dial: "234", flag: "🇳🇬" },
  { iso: "KE", name: "Kenya", dial: "254", flag: "🇰🇪" },
  { iso: "IN", name: "India", dial: "91", flag: "🇮🇳" },
  { iso: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰" },
  { iso: "BD", name: "Bangladesh", dial: "880", flag: "🇧🇩" },
  { iso: "CN", name: "China", dial: "86", flag: "🇨🇳" },
  { iso: "JP", name: "Japan", dial: "81", flag: "🇯🇵" },
  { iso: "KR", name: "South Korea", dial: "82", flag: "🇰🇷" },
  { iso: "AU", name: "Australia", dial: "61", flag: "🇦🇺" },
  { iso: "NZ", name: "New Zealand", dial: "64", flag: "🇳🇿" },
  { iso: "BR", name: "Brazil", dial: "55", flag: "🇧🇷" },
  { iso: "MX", name: "Mexico", dial: "52", flag: "🇲🇽" },
  { iso: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { iso: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" },
  { iso: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { iso: "PH", name: "Philippines", dial: "63", flag: "🇵🇭" },
  { iso: "ID", name: "Indonesia", dial: "62", flag: "🇮🇩" },
  { iso: "MY", name: "Malaysia", dial: "60", flag: "🇲🇾" },
  { iso: "SG", name: "Singapore", dial: "65", flag: "🇸🇬" },
  { iso: "TH", name: "Thailand", dial: "66", flag: "🇹🇭" },
  { iso: "VN", name: "Vietnam", dial: "84", flag: "🇻🇳" },
  { iso: "IL", name: "Israel", dial: "972", flag: "🇮🇱" },
  { iso: "RU", name: "Russia", dial: "7", flag: "🇷🇺" },
]

export const DEFAULT_COUNTRY_ISO = "US"

const BY_DIAL_LEN = [...COUNTRY_DIALS].sort((a, b) => b.dial.length - a.dial.length)

export function getCountryByIso(iso: string): CountryDial {
  return COUNTRY_DIALS.find((c) => c.iso === iso) || COUNTRY_DIALS[0]!
}

export function nationalDigits(raw: string): string {
  return String(raw || "").replace(/\D/g, "").replace(/^0+/, "")
}

export function composeE164(dial: string, national: string): string {
  const n = nationalDigits(national)
  if (!n) return ""
  return `+${dial}${n}`
}

export function splitPhone(
  full: string,
  fallbackIso = DEFAULT_COUNTRY_ISO,
): { iso: string; dial: string; national: string } {
  const digits = String(full || "").replace(/\D/g, "")
  if (!digits) {
    const c = getCountryByIso(fallbackIso)
    return { iso: c.iso, dial: c.dial, national: "" }
  }
  for (const c of BY_DIAL_LEN) {
    if (digits.startsWith(c.dial) && digits.length > c.dial.length) {
      return { iso: c.iso, dial: c.dial, national: digits.slice(c.dial.length) }
    }
  }
  const c = getCountryByIso(fallbackIso)
  return { iso: c.iso, dial: c.dial, national: digits }
}
