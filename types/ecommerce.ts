export interface ProductColor {
  name: string
  hex: string
  /** Primary swatch / first gallery image */
  image: string
  image2?: string
  /** Full gallery for this color (all available angles) */
  images?: string[]
}

export interface ProductVariant {
  id: string
  title: string
  size?: string
  colorName?: string
  shadeHex?: string
  inStock: boolean
  stock?: number
  price: number
}

export interface Product {
  id: string
  title: string
  handle: string
  brand: string
  category: string
  categorySlug?: string
  subCategory: string
  subCategorySlug?: string
  /** Apparel type e.g. Cardigans, Trousers, Boots — derived from catalog */
  productType?: string
  productTypeSlug?: string
  department?: "clothes" | "skincare" | "electronics"
  gender?: string
  concerns?: string[]
  isLuxury?: boolean
  isDermoCosmetic?: boolean
  price: number
  compareAtPrice?: number
  costPrice?: number
  stock?: number
  inStock?: boolean
  currency: string
  images: string[]
  variants: ProductVariant[]
  colors?: ProductColor[]
  sizes?: string[]
  description?: string
  details?: string[]
  specs?: Record<string, string>
  ingredients?: string[]
  usageInstructions?: string
  rating?: number
  reviewCount?: number
  badge?: string
  promoCode?: string
  createdAt?: string
}

export interface NavigationCategory {
  id: string
  label: string
  href: string
  sections: {
    title: string
    items: { label: string; href: string; tag?: string }[]
  }[]
  featured?: {
    title: string
    subtitle: string
    href: string
    image: string
  }
}

export interface CartLine {
  productId: string
  variantId: string
  title: string
  variantTitle: string
  brand: string
  image: string
  price: number
  quantity: number
  handle: string
  size?: string
  color?: string
}

export interface Currency {
  code: string
  symbol: string
  rate: number
  label: string
  flag: string
}

export interface AISkinScanResult {
  scores: {
    hydration: number
    redness: number
    blemishes: number
    wrinkles: number
    texture: number
  }
  primaryConcern: string
  recommendedProductIds: string[]
}

export type DepartmentType = "clothes" | "skincare" | "electronics"

export interface OrderItem {
  productId: string
  title: string
  handle: string
  brand: string
  quantity: number
  price: number
  costPrice?: number
  size?: string
  color?: string
  image: string
  department: DepartmentType
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  shippingAddress: {
    line1: string
    city: string
    state?: string
    zip: string
    country: string
  }
  items: OrderItem[]
  totalAmount: number
  subtotal: number
  shippingCost: number
  discount: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  paymentMethod: "card" | "cod" | "apple_pay" | "paypal"
  paymentStatus: "paid" | "pending" | "refunded"
  department: DepartmentType
  trackingNumber?: string
  createdAt: string
}

export interface DeliveryZone {
  id: string
  name: string
  countries: string[]
  standardRate: number
  expressRate: number
  freeThreshold: number
  estimatedDays: string
  status: "active" | "inactive"
}
