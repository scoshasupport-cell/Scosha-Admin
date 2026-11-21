import type { BannerData } from "@/components/home/editorial-banner"

/** Editorial banners — winter Cloudinary + curtain Amazon product images */
export const EDITORIAL_BANNERS: BannerData[] = [
  {
    id: 1,
    eyebrow: "Winter Collection",
    title: "Dressed for the cold",
    text: "Teddy coats, tracksuits and tailored winter layers — Cloudinary product photography.",
    cta: "Shop Clothes",
    href: "/shop?category=Clothes",
    image:
      "https://res.cloudinary.com/qphi6pla/image/upload/v1791058639/scosha/static/dvorgstbpmb7wdjahvya.jpg",
  },
  {
    id: 2,
    eyebrow: "Home",
    title: "Light for every room",
    text: "Natural linen and sage net curtains — Amazon product photos for the curtain range.",
    cta: "Shop Home",
    href: "/shop?category=furniture",
    image: "https://m.media-amazon.com/images/I/91y+GaYoWjL._AC_SL1500_.jpg",
  },
]
