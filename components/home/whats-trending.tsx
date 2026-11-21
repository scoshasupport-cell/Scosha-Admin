import Image from "next/image"
import Link from "next/link"
import { CATEGORY_ROUTES } from "@/lib/category-routes"

/** Images from /public/whatstrending — filename maps to tag */
const TRENDS = [
  {
    tag: "#StreetStyle",
    image: "/whatstrending/streetstyle.jpeg",
    href: CATEGORY_ROUTES.men.href,
  },
  {
    tag: "#WinterEdit",
    image: "/whatstrending/winteredit.jpeg",
    href: CATEGORY_ROUTES.women.href,
  },
  {
    tag: "#HomeLuxe",
    image: "/whatstrending/homeluxe.jpeg",
    href: CATEGORY_ROUTES.home.href,
  },
  {
    tag: "#QuietLuxury",
    image: "/whatstrending/Quietluxury.jpeg",
    href: CATEGORY_ROUTES.women.href,
  },
  {
    tag: "#CurtainEdit",
    image: "/whatstrending/CurtainEdiy.jpeg",
    href: CATEGORY_ROUTES.home.href,
  },
  {
    tag: "#Essentials",
    image: "/whatstrending/Essentials.jpeg",
    href: CATEGORY_ROUTES.bags.href,
  },
] as const

export function WhatsTrending() {
  return (
    <section className="store-container pb-12 sm:pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2 sm:mb-6">
        <h2 className="font-serif text-xl font-black tracking-tight text-primary-text sm:text-2xl md:text-3xl">
          What&apos;s Trending
        </h2>
        <Link
          href="/shop"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand"
        >
          View all →
        </Link>
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
        {TRENDS.map((t) => (
          <Link
            key={t.tag}
            href={t.href}
            className="group relative aspect-square w-[58vw] max-w-[14rem] shrink-0 snap-start overflow-hidden rounded-xl sm:w-auto sm:max-w-none"
          >
            <Image
              src={t.image}
              alt={t.tag}
              fill
              sizes="(max-width: 640px) 42vw, 16vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
            <span className="absolute inset-x-0 bottom-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              {t.tag}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
