export type HeroSlide = {
  id: string
  alt: string
  imageSrc: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}

/**
 * Hero slides from /public/slideimages.
 * Literal hrefs keep SSR and client markup identical.
 */
export const heroSlides: HeroSlide[] = [
  {
    id: "woman-white",
    alt: "SCOSHA — The New Edit, white knit suit",
    imageSrc: "/slideimages/woman-white.jpeg",
    title: "SCOSHA",
    subtitle: "The New Edit",
    ctaLabel: "Discover the Collection",
    ctaHref: "/shop?category=clothes&subCategory=clothes-women",
  },
  {
    id: "slide-2",
    alt: "SCOSHA — Menswear edit",
    imageSrc: "/slideimages/slide-2.jpeg",
    title: "SCOSHA",
    subtitle: "Menswear Edit",
    ctaLabel: "Discover the Collection",
    ctaHref: "/shop?category=clothes&subCategory=clothes-men",
  },
  {
    id: "slide-3",
    alt: "SCOSHA — Beauty and accessories",
    imageSrc: "/slideimages/slide-3.jpeg",
    title: "SCOSHA",
    subtitle: "Beauty & Accessories",
    ctaLabel: "Discover the Collection",
    ctaHref: "/skincare",
  },
]

/** Native slide art ratio */
export const HERO_ASPECT = "1672 / 941"
