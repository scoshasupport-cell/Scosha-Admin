export type PromoBanner = {
  id: string
  brand: string
  line: string
  href: string
  gradient: string
  imageSrc?: string
}

export type PromoGridSet = {
  id: string
  banners: PromoBanner[]
}

/** Amaz catalog promo tiles — winter Cloudinary / curtain Amazon product images */
export const promoGridSets: PromoGridSet[] = [
  {
    id: "set-1",
    banners: [
      {
        id: "b1-1",
        brand: "Winter Suits",
        line: "Groom & Party Tailoring",
        href: "/shop?category=Clothes",
        gradient: "linear-gradient(135deg,#1f1f1f,#2a2a2a)",
        imageSrc:
          "https://res.cloudinary.com/qphi6pla/image/upload/v1791058640/scosha/static/d3ax3kj9kboy1qv57jdt.jpg",
      },
      {
        id: "b1-2",
        brand: "Outerwear",
        line: "Windbreakers & Jackets",
        href: "/shop?category=Clothes",
        gradient: "linear-gradient(135deg,#171717,#242424)",
        imageSrc:
          "https://res.cloudinary.com/qphi6pla/image/upload/v1791058640/scosha/static/kpsw8ky81st4hnuwznml.jpg",
      },
      {
        id: "b1-3",
        brand: "Boots",
        line: "Western & Chelsea Styles",
        href: "/shop?category=Clothes&subCategory=Shoes",
        gradient: "linear-gradient(135deg,#1a1a1a,#2c2c2c)",
        imageSrc:
          "https://res.cloudinary.com/qphi6pla/image/upload/v1791058641/scosha/static/kukihkkmlrdhhugqoyev.jpg",
      },
      {
        id: "b1-4",
        brand: "Hoodies",
        line: "Check Zip & Lounge Layers",
        href: "/shop?category=Clothes",
        gradient: "linear-gradient(135deg,#212121,#303030)",
        imageSrc:
          "https://res.cloudinary.com/qphi6pla/image/upload/v1791058642/scosha/static/hlb7hponswazjsckbmqr.jpg",
      },
    ],
  },
  {
    id: "set-2",
    banners: [
      {
        id: "b2-1",
        brand: "Linen Curtains",
        line: "140 × 235 Natural Linen",
        href: "/shop?category=Furniture",
        gradient: "linear-gradient(135deg,#1f1f1f,#2b2b2b)",
        imageSrc: "https://m.media-amazon.com/images/I/81XCz0qN-LL._AC_SL1500_.jpg",
      },
      {
        id: "b2-2",
        brand: "Sage Net Curtains",
        line: "Modern Living Room Sheer",
        href: "/shop?category=Furniture",
        gradient: "linear-gradient(135deg,#171717,#252525)",
        imageSrc: "https://m.media-amazon.com/images/I/91y+GaYoWjL._AC_SL1500_.jpg",
      },
      {
        id: "b2-3",
        brand: "Olive Curtains",
        line: "Semi-Sheer Window Decor",
        href: "/shop?category=Furniture",
        gradient: "linear-gradient(135deg,#1c1c1c,#2e2e2e)",
        imageSrc: "https://m.media-amazon.com/images/I/81lGC9SKN2L._AC_SL1500_.jpg",
      },
      {
        id: "b2-4",
        brand: "Bedding",
        line: "Organic Cotton Sheets",
        href: "/shop?category=Furniture",
        gradient: "linear-gradient(135deg,#1a1a1a,#292929)",
        imageSrc: "https://m.media-amazon.com/images/I/71TppNax9QL._AC_SL1348_.jpg",
      },
    ],
  },
]
