export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  status?: string;
  role?: Role | string;
  roleId?: string | Role;
  permissions?: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions?: Permission[] | string[];
  createdAt?: string;
}

export interface Permission {
  _id: string;
  resource: string;
  action: string;
  name?: string;
}

export interface Product {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  details?: string[];
  specs?: Record<string, string>;
  brandId?: string | Brand;
  categoryId?: string | Category;
  subCategoryId?: string | Category | null;
  collectionIds?: string[];
  basePrice: number;
  comparePrice?: number | null;
  images?: string[];
  tags?: string[];
  status: 'draft' | 'active' | 'archived';
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  vipEarlyAccess?: boolean;
  relatedProductIds?: string[];
  seo?: Seo;
  weight?: number;
  badge?: string | null;
  variants?: Variant[];
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Variant {
  _id: string;
  id?: string | number;
  productId?: string | Product | number;
  color?: { name: string; hex?: string };
  size?: string;
  sku?: string;
  price?: number;
  comparePrice?: number | null;
  stock?: number;
  weight?: number;
  images?: string[];
  status?: 'active' | 'inactive';
  product?: Product;
}

export interface Category {
  _id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  image?: string;
  description?: string;
  status?: 'active' | 'inactive';
  sortOrder?: number;
  seo?: Seo;
  children?: Category[];
}

export interface Brand {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
  banner?: string;
  description?: string;
  status?: 'active' | 'inactive';
  sortOrder?: number;
  seo?: Seo;
}

export interface Collection {
  _id: string;
  id?: string | number;
  name?: string;
  title: string;
  slug?: string;
  subtitle?: string;
  image?: string;
  productIds?: string[];
  featured?: boolean;
  seasonal?: boolean;
  status?: 'active' | 'inactive';
  accessLevel?: 'draft' | 'vip_early_access' | 'public';
  publicAt?: string | null;
  sortOrder?: number;
  seo?: Seo;
}

export interface Order {
  _id: string;
  id?: string | number;
  orderNumber?: string;
  user?: Customer | string;
  userId?: string | Customer;
  status: OrderStatus;
  items?: OrderItem[];
  subtotal?: number;
  shipping?: number;
  shippingCharge?: number;
  discount?: number;
  couponDiscount?: number;
  couponCode?: string | null;
  tax?: number;
  total?: number;
  currency?: string;
  deliveryMethod?: string;
  paymentMethod?: string;
  trackingNumber?: string | null;
  shippingAddress?: Address;
  paymentStatus?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  timeline?: { status: string; note?: string; at?: string }[];
  statusHistory?: { status: string; note?: string; at?: string }[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  _id?: string;
  id?: string | number;
  productId?: string;
  name?: string;
  title?: string;
  sku?: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  lineTotal?: number;
  color?: string;
  size?: string;
  image?: string;
  imageUrl?: string;
  variant?: { color?: string; size?: string };
}

export interface Address {
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  zip?: string;
  country?: string;
}

export interface Customer {
  _id: string;
  id?: string | number;
  name?: string;
  email: string;
  phone?: string;
  status?: string;
  createdAt?: string;
  ordersCount?: number;
  totalSpent?: number;
  addresses?: Address[];
  isVip?: boolean;
  vipUnlockedAt?: string | null;
  vipPendingDiscountPercent?: number;
  freeDeliveryCredits?: number;
  vipCongratsSeen?: boolean;
  vipEarlyAccess?: boolean;
  recentOrders?: Order[];
}

export interface Coupon {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  usedCount?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  status?: 'active' | 'inactive';
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
}

export interface Review {
  _id: string;
  product?: Product | string;
  productId?: string | Product;
  user?: Customer | string;
  userId?: string | Customer;
  rating: number;
  title?: string;
  comment?: string;
  status?: string;
  reply?: string;
  createdAt?: string;
}

export interface MediaAsset {
  _id: string;
  url: string;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  folder?: string;
  createdAt?: string;
}

export interface HomepageSection {
  _id: string;
  type: string;
  title?: string;
  config?: Record<string, unknown>;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CmsPage {
  _id: string;
  title: string;
  slug?: string;
  content?: string;
  seo?: Seo;
  status?: 'draft' | 'published' | 'archived';
  updatedAt?: string;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string | null;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  publishedAt?: string | null;
  seo?: Seo;
  updatedAt?: string;
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  category?: string | null;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead?: boolean;
  reply?: string;
  createdAt?: string;
}

export interface NewsletterSubscriber {
  _id: string;
  email: string;
  status?: string;
  createdAt?: string;
}

export interface StoreSettings {
  storeName?: string;
  logo?: string | null;
  favicon?: string | null;
  email?: string;
  phone?: string | null;
  address?: string | null;
  currency?: string;
  timezone?: string;
  language?: string;
  seo?: Seo;
  socialLinks?: Record<string, string | null>;
  shipping?: {
    standardCharge?: number;
    expressCharge?: number;
    freeShippingThreshold?: number;
    standardEta?: string;
    expressEta?: string;
  };
  taxes?: { rate?: number; included?: boolean };
  paymentMethods?: { key: string; label: string; enabled?: boolean }[];
  adminEmail?: string;
  lowStockThreshold?: number;
}

export interface Seo {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface Notification {
  _id: string;
  title: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  link?: string;
  createdAt?: string;
}

export interface DashboardStats {
  revenue?: number;
  totalRevenue?: number;
  orders?: number;
  totalOrders?: number;
  customers?: number;
  totalCustomers?: number;
  products?: number;
  totalProducts?: number;
  pendingOrders?: number;
  lowStock?: number;
  [key: string]: unknown;
}

export interface ChartPoint {
  date?: string;
  label?: string;
  value?: number;
  revenue?: number;
  orders?: number;
  count?: number;
}

export interface SizeChartField {
  id: string;
  label: string;
  instruction: string;
}

export interface SizeChartRow {
  label: string;
  regionalSizes: {
    us: string;
    uk: string;
    eu: string;
  };
  measurements: Record<string, number | { min: number; max: number }>;
}

export interface SizeChart {
  id?: number | string;
  _id?: string;
  name: string;
  brandId?: number | string | null;
  brand?: Brand | null;
  gender: 'women' | 'men' | 'kids';
  category: string;
  unit?: 'cm' | 'in';
  measurementFields: SizeChartField[];
  sizes: SizeChartRow[];
  recommendationRules?: Record<string, unknown> | null;
  isDefault?: boolean;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

