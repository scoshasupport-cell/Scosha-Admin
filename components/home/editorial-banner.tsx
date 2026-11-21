"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export interface BannerData {
  id: number
  eyebrow: string
  title: string
  text: string
  cta: string
  href: string
  image: string
}

export function EditorialBanner({
  banner,
  reverse = false,
}: {
  banner: BannerData
  reverse?: boolean
}) {
  return (
    <section className="store-container py-8 sm:py-12">
      <div
        className="overflow-hidden rounded-3xl shadow-2xl shadow-brand/15"
        style={{ background: "#7A1F2B" }}
      >
        <div className="grid items-stretch gap-0 md:grid-cols-2">
          {/* Image Column */}
          <div
            className={`relative min-h-52 w-full overflow-hidden sm:min-h-80 md:min-h-120 ${reverse ? "md:order-2" : ""}`}
          >
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover opacity-90 transition-transform duration-700 hover:scale-105"
            />
            {/* Subtle overlay to blend with gradient */}
            <div
              className={`absolute inset-0 ${
                reverse
                  ? "bg-linear-to-l from-transparent to-brand/20"
                  : "bg-linear-to-r from-transparent to-brand/20"
              }`}
            />
          </div>

          {/* Content Column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`flex flex-col justify-center px-5 py-8 text-white sm:px-12 sm:py-16 md:px-14 md:py-20 ${reverse ? "md:order-1" : ""}`}
          >
            {/* Eyebrow */}
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm sm:mb-4 sm:px-4 sm:py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-highlight" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px]">
                {banner.eyebrow}
              </span>
            </div>

            <h2 className="text-2xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl md:text-5xl">
              {banner.title}
            </h2>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:mt-5">
              {banner.text}
            </p>

            <div className="mt-6 sm:mt-8">
              <Link
                href={banner.href}
                className="group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/15 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-all hover:border-transparent hover:bg-white hover:text-brand hover:shadow-lg sm:px-7 sm:py-3.5 sm:text-xs"
              >
                <span>{banner.cta}</span>
                <ArrowRight size={14} strokeWidth={2.4} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
