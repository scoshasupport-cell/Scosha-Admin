import Link from "next/link"
import Image from "next/image"
import type { PromoGridSet } from "@/lib/promo-grid-data"

export function PromoGrid({ set }: { set: PromoGridSet }) {
  return (
    <section className="store-container py-6 sm:py-8">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pr-4 md:grid md:grid-cols-2 md:overflow-visible md:pr-0 lg:grid-cols-4">
        {set.banners.map((b) => (
          <Link
            key={b.id}
            href={b.href}
            className="group relative flex aspect-square w-[42vw] max-w-60 shrink-0 snap-start overflow-hidden rounded-2xl bg-surface-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand/15 md:w-auto md:max-w-none"
          >
            {b.imageSrc ? (
              <Image
                src={b.imageSrc}
                alt={b.brand || b.line || "Promotion"}
                fill
                sizes="(max-width: 768px) 44vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-primary-text/85 via-primary-text/25 to-transparent transition-opacity group-hover:from-primary-text/90" />

            {/* Indigo glow accent on hover */}
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20 rounded-2xl"
              style={{ background: "#7A1F2B" }}
            />

            <div className="relative z-10 mt-auto flex flex-col justify-end p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-highlight">{b.brand}</p>
              <p className="mt-1 text-[13px] font-bold leading-snug text-white">{b.line}</p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/60 transition-all group-hover:text-highlight group-hover:gap-1.5">
                Shop Edit &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
