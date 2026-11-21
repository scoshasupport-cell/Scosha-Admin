import Image from "next/image"
import Link from "next/link"
import { CATEGORY_ROUTES } from "@/lib/category-routes"

const TILES = [
  {
    label: "Women",
    href: CATEGORY_ROUTES.women.href,
    image: "/main-category-slider/Women11.jpeg",
  },
  {
    label: "Men",
    href: CATEGORY_ROUTES.men.href,
    image: "/main-category-slider/men1.jpeg",
  },
  {
    label: "Beauty",
    href: CATEGORY_ROUTES.beauty.href,
    image: "/main-category-slider/beauty1.jpeg",
  },
  {
    label: "Tech",
    href: CATEGORY_ROUTES.tech.href,
    image: "/main-category-slider/Tech.jpeg",
  },
]

export function ScoshaEditGrid() {
  return (
    <section className="store-container py-10 sm:py-14">
      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr] md:gap-5">
        <Link
          href="/shop"
          className="group relative min-h-56 overflow-hidden rounded-2xl sm:min-h-80 md:min-h-110"
        >
          <Image
            src="/main-category-slider/timeless.jpeg"
            alt="Timeless Everyday"
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5 sm:p-7">
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-white sm:text-2xl md:text-3xl">
              Timeless Everyday
            </h2>
            <span
              className="mt-3 inline-flex rounded-md px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white sm:mt-4 sm:px-5 sm:py-2.5 sm:text-[11px]"
              style={{ background: "#7A1F2B" }}
            >
              Explore Now
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {TILES.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="group relative aspect-square overflow-hidden rounded-2xl"
            >
              <Image
                src={tile.image}
                alt={tile.label}
                fill
                sizes="(max-width: 768px) 50vw, 22vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/35 transition group-hover:bg-black/45" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <span className="font-serif text-base font-bold uppercase tracking-wide sm:text-xl md:text-2xl">
                  {tile.label}
                </span>
                <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85 sm:mt-2 sm:tracking-[0.16em]">
                  Discover →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
