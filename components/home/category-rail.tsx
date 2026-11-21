import Image from "next/image"
import Link from "next/link"

/** Main shop categories — winter sheet → Clothes, curtains sheet → Home */
const CATEGORIES = [
  {
    label: "Clothes",
    href: "/shop?category=clothes",
    image:
      "https://res.cloudinary.com/qphi6pla/image/upload/v1791058664/scosha/static/knb23iyvlljcs2vpom3w.jpg",
    desc: "Winter apparel, shoes & bags",
  },
  {
    label: "Home",
    href: "/shop?category=furniture",
    image: "https://m.media-amazon.com/images/I/81NDqE5EizL._AC_SL1500_.jpg",
    desc: "Curtains, bedding & home",
  },
  {
    label: "Skincare",
    href: "/skincare",
    image:
      "https://res.cloudinary.com/qphi6pla/image/upload/v1791058663/scosha/static/c7pwiutxmvnuu7lmrmyc.jpg",
    desc: "Coming soon",
  },
  {
    label: "Electronics",
    href: "/electronics",
    image:
      "https://res.cloudinary.com/qphi6pla/image/upload/v1791058640/scosha/static/kpsw8ky81st4hnuwznml.jpg",
    desc: "Coming soon",
  },
]

export function CategoryRail() {
  return (
    <section className="store-container py-12 sm:py-16">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            Browse Categories
          </p>
          <h2 className="text-2xl font-black tracking-tight text-primary-text sm:text-3xl">
            Shop by Category
          </h2>
          <p className="mt-2 text-sm text-subtext">
            Clothes, Home, Skincare and Electronics.
          </p>
        </div>
        <Link
          href="/shop"
          className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-subtext transition-all hover:border-brand hover:bg-brand-light hover:text-brand sm:px-4 sm:text-xs"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/15 sm:aspect-3/4"
          >
            <Image
              src={cat.image || "/placeholder.svg"}
              alt={cat.label}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-primary-text/85 via-primary-text/20 to-transparent" />

            <div
              className="absolute left-3 top-3 h-2 w-2 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-highlight"
            />

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <span className="block text-base font-bold tracking-tight sm:text-lg">{cat.label}</span>
              <span className="mt-0.5 block text-[11px] text-white/70">{cat.desc}</span>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60 transition-all group-hover:text-highlight">
                <span>Discover</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
