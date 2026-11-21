import type { ReactNode } from "react"
import Image from "next/image"

export function CmsPage({
  title,
  bannerSrc,
  bannerMobileSrc,
  children,
}: {
  title: string
  bannerSrc?: string
  bannerMobileSrc?: string
  children: ReactNode
}) {
  return (
    <main className="store-container py-8 md:py-12">
      {bannerSrc && (
        <div className="relative mb-8 aspect-2/1 w-full overflow-hidden rounded-[10px] sm:aspect-4/1 bg-[#fafafa]">
          <div className={`relative h-full w-full ${bannerMobileSrc ? "hidden sm:block" : "block"}`}>
            <Image src={bannerSrc} alt={title} fill className="object-fill" priority />
          </div>
          {bannerMobileSrc && (
            <div className="relative h-full w-full sm:hidden">
              <Image src={bannerMobileSrc} alt={title} fill className="object-fill" priority />
            </div>
          )}
        </div>
      )}
      <h1 className="mb-6 text-[28px] font-bold text-black md:text-[34px]">{title}</h1>
      <div className="max-w-3xl space-y-4 text-[16px] leading-[1.65] text-[#444444]">{children}</div>
    </main>
  )
}
