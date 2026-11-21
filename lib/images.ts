/** Resolve catalog image keys / URLs for Scosha storefront. */

export function isAmazonUrl(url: string | undefined | null): boolean {
  if (!url) return false
  return /amazon\.com|amazon\.in|amzn\.to|media-amazon\.com|ssl-images-amazon\.com|m\.media-amazon\.com/i.test(
    url,
  )
}

/** Winter clothes prefer Cloudinary; furniture/curtains keep Amazon listing photos. */
export function filterNonAmazonImages(urls: string[]): string[] {
  const clean = urls.filter((u) => !isAmazonUrl(u))
  return clean.length > 0 ? clean : urls
}

export function productImageSrc(src?: string | null): string {
  if (!src) return "/placeholder.svg"
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
    return src.startsWith("//") ? `https:${src}` : src
  }
  if (src.startsWith("/")) return src
  return "/placeholder.svg"
}

export function productImages(list?: string[] | null): string[] {
  const mapped = (list || []).map(productImageSrc).filter(Boolean)
  return mapped.length ? mapped : ["/placeholder.svg"]
}
