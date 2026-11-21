export type SizeAudience = "women" | "men" | "kids"
export type SizeChartKind = "tops" | "bottoms" | "dresses" | "kids-tops" | "kids-bottoms"

export interface SizeRow {
  label: string
  us: string
  uk: string
  eu: string
  cols: Record<string, string>
}

export interface SizeChart {
  id: SizeChartKind
  title: string
  audience: SizeAudience
  hint: string
  columns: string[]
  rows: SizeRow[]
}

export const SIZE_GUIDE_TIP =
  "Our garments follow precision EU & US sizing. If you are between measurements, we recommend sizing up for a relaxed fit."

export const SIZE_MEASURE_TIPS = [
  "Chest / Bust: Measure around the fullest part of your chest, keeping the tape level.",
  "Waist: Measure around your natural waistline, usually right at the belly button.",
  "Hips: Measure around the fullest part of your hips/seat.",
  "Use a soft measuring tape snug against light clothing, but not tight.",
]

export const SIZE_CHARTS: SizeChart[] = [
  {
    id: "tops",
    title: "Women's Tops, T-Shirts & Outerwear",
    audience: "women",
    hint: "Measure bust and waist. Standard EU sizing 32 (XXS) to 42 (XL).",
    columns: ["Size", "US", "UK", "EU", "Bust", "Waist"],
    rows: [
      { label: "XXS", us: "XXS", uk: "4", eu: "32", cols: { Bust: '31½" / 80 cm', Waist: '22¾" / 58 cm' } },
      { label: "XS", us: "XS", uk: "6", eu: "34", cols: { Bust: '32¼" / 82 cm', Waist: '24½" / 62 cm' } },
      { label: "S", us: "S", uk: "8", eu: "36", cols: { Bust: '34" / 86 cm', Waist: '26" / 66 cm' } },
      { label: "M", us: "M", uk: "10", eu: "38", cols: { Bust: '35½" / 90 cm', Waist: '27½" / 70 cm' } },
      { label: "L", us: "L", uk: "12", eu: "40", cols: { Bust: '37¾" / 96 cm', Waist: '30" / 76 cm' } },
      { label: "XL", us: "XL", uk: "14", eu: "42", cols: { Bust: '40¼" / 102 cm', Waist: '32¼" / 82 cm' } },
      { label: "XXL", us: "XXL", uk: "16", eu: "44", cols: { Bust: '42½" / 108 cm', Waist: '34½" / 88 cm' } },
    ],
  },
  {
    id: "bottoms",
    title: "Women's Jeans, Pants & Trousers",
    audience: "women",
    hint: "Match waist and hip measurements for tailored fit.",
    columns: ["Size", "US", "UK", "EU", "Waist", "Hips"],
    rows: [
      { label: "XS", us: "XS", uk: "6", eu: "34", cols: { Waist: '24½" / 62 cm', Hips: '35½" / 90 cm' } },
      { label: "S", us: "S", uk: "8", eu: "36", cols: { Waist: '26" / 66 cm', Hips: '37" / 94 cm' } },
      { label: "M", us: "M", uk: "10", eu: "38", cols: { Waist: '27½" / 70 cm', Hips: '38½" / 98 cm' } },
      { label: "L", us: "L", uk: "12", eu: "40", cols: { Waist: '30" / 76 cm', Hips: '41" / 104 cm' } },
      { label: "XL", us: "XL", uk: "14", eu: "42", cols: { Waist: '32¼" / 82 cm', Hips: '43¼" / 110 cm' } },
    ],
  },
  {
    id: "dresses",
    title: "Women's Dresses",
    audience: "women",
    hint: "Compare bust, waist, and hips to ensure balanced drape.",
    columns: ["Size", "US", "UK", "EU", "Bust", "Waist", "Hips"],
    rows: [
      { label: "XS", us: "XS", uk: "6", eu: "34", cols: { Bust: '32¼" / 82 cm', Waist: '24½" / 62 cm', Hips: '35½" / 90 cm' } },
      { label: "S", us: "S", uk: "8", eu: "36", cols: { Bust: '34" / 86 cm', Waist: '26" / 66 cm', Hips: '37" / 94 cm' } },
      { label: "M", us: "M", uk: "10", eu: "38", cols: { Bust: '35½" / 90 cm', Waist: '27½" / 70 cm', Hips: '38½" / 98 cm' } },
      { label: "L", us: "L", uk: "12", eu: "40", cols: { Bust: '37¾" / 96 cm', Waist: '30" / 76 cm', Hips: '41" / 104 cm' } },
      { label: "XL", us: "XL", uk: "14", eu: "42", cols: { Bust: '40¼" / 102 cm', Waist: '32¼" / 82 cm', Hips: '43¼" / 110 cm' } },
    ],
  },
  {
    id: "tops",
    title: "Men's Tops, T-Shirts & Jackets",
    audience: "men",
    hint: "S (EU 46) through XXL (EU 54). Match chest measurement.",
    columns: ["Size", "US", "UK", "EU", "Chest", "Waist"],
    rows: [
      { label: "S", us: "S", uk: "36", eu: "46", cols: { Chest: '35–36½" / 89–93 cm', Waist: '29–31" / 74–79 cm' } },
      { label: "M", us: "M", uk: "38", eu: "48", cols: { Chest: '37–38½" / 94–98 cm', Waist: '32–34" / 81–86 cm' } },
      { label: "L", us: "L", uk: "40", eu: "50", cols: { Chest: '39–40½" / 99–103 cm', Waist: '35–37" / 89–94 cm' } },
      { label: "XL", us: "XL", uk: "42", eu: "52", cols: { Chest: '41–42½" / 104–108 cm', Waist: '38–40" / 96–101 cm' } },
      { label: "XXL", us: "XXL", uk: "44", eu: "54", cols: { Chest: '43–45" / 109–114 cm', Waist: '41–43" / 104–109 cm' } },
    ],
  },
  {
    id: "bottoms",
    title: "Men's Trousers, Jeans & Shorts",
    audience: "men",
    hint: "Match waist measurement. Inseam standard is 32 inches.",
    columns: ["Size", "US", "UK", "EU", "Waist", "Hips"],
    rows: [
      { label: "S", us: "S (30)", uk: "30", eu: "46", cols: { Waist: '30–31½" / 76–80 cm', Hips: '37–38" / 94–97 cm' } },
      { label: "M", us: "M (32)", uk: "32", eu: "48", cols: { Waist: '32–33½" / 81–85 cm', Hips: '39–40" / 99–102 cm' } },
      { label: "L", us: "L (34)", uk: "34", eu: "50", cols: { Waist: '34–35½" / 86–90 cm', Hips: '41–42" / 104–107 cm' } },
      { label: "XL", us: "XL (36)", uk: "36", eu: "52", cols: { Waist: '36–38" / 91–96 cm', Hips: '43–44" / 109–112 cm' } },
      { label: "XXL", us: "XXL (38)", uk: "38", eu: "54", cols: { Waist: '39–41" / 99–104 cm', Hips: '45–47" / 114–119 cm' } },
    ],
  },
  {
    id: "kids-tops",
    title: "Kids' Clothing & Outerwear",
    audience: "kids",
    hint: "EU size corresponds to child's height in cm. Prefer height over age.",
    columns: ["Age", "US", "UK", "EU", "Chest", "Waist", "Height"],
    rows: [
      { label: "2–3Y", us: "3T", uk: "2–3", eu: "98", cols: { Chest: '21.7" / 55 cm', Waist: '20.5" / 52 cm', Height: '38.6" / 98 cm' } },
      { label: "3–4Y", us: "4T", uk: "3–4", eu: "104", cols: { Chest: '22.2" / 56.5 cm', Waist: '20.9" / 53 cm', Height: '40.9" / 104 cm' } },
      { label: "4–5Y", us: "5", uk: "4–5", eu: "110", cols: { Chest: '22.8" / 58 cm', Waist: '21.3" / 54 cm', Height: '43.3" / 110 cm' } },
      { label: "5–6Y", us: "6", uk: "5–6", eu: "116", cols: { Chest: '23.4" / 59.5 cm', Waist: '21.7" / 55 cm', Height: '45.7" / 116 cm' } },
      { label: "6–7Y", us: "7", uk: "6–7", eu: "122", cols: { Chest: '24.4" / 62 cm', Waist: '22.2" / 56.5 cm', Height: '48.0" / 122 cm' } },
      { label: "7–8Y", us: "8", uk: "7–8", eu: "128", cols: { Chest: '25.4" / 64.5 cm', Waist: '22.8" / 58 cm', Height: '50.4" / 128 cm' } },
    ],
  },
]

export function getChartForProduct(category: string, subCategory: string): SizeChart {
  const cat = category.toLowerCase()
  const sub = subCategory.toLowerCase()

  if (cat.includes("kid")) {
    return SIZE_CHARTS.find((c) => c.audience === "kids") || SIZE_CHARTS[5]
  }

  if (cat.includes("men")) {
    if (sub.includes("jean") || sub.includes("trouser") || sub.includes("short") || sub.includes("pant")) {
      return SIZE_CHARTS.find((c) => c.audience === "men" && c.id === "bottoms") || SIZE_CHARTS[4]
    }
    return SIZE_CHARTS.find((c) => c.audience === "men" && c.id === "tops") || SIZE_CHARTS[3]
  }

  // Default women
  if (sub.includes("dress")) {
    return SIZE_CHARTS.find((c) => c.id === "dresses") || SIZE_CHARTS[2]
  }
  if (sub.includes("jean") || sub.includes("trouser") || sub.includes("pant") || sub.includes("short")) {
    return SIZE_CHARTS.find((c) => c.audience === "women" && c.id === "bottoms") || SIZE_CHARTS[1]
  }

  return SIZE_CHARTS[0]
}
