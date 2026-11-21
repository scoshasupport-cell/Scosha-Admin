import Link from "next/link"
import Image from "next/image"

interface CampaignBannerProps {
  desktopSrc: string
  mobileSrc?: string
  alt: string
  href: string
}

export function CampaignBanner({ desktopSrc, mobileSrc, alt, href }: CampaignBannerProps) {
  return (
    <section className="store-container py-3 sm:py-6">
      <Link
        href={href}
        className="group relative block aspect-2/1 w-full overflow-hidden rounded-[10px] sm:aspect-4/1 sm:rounded-xl bg-[#fafafa]"
      >
        {/* Desktop Banner Image */}
        <div className={`relative h-full w-full ${mobileSrc ? "hidden sm:block" : "block"}`}>
          <Image
            src={desktopSrc}
            alt={alt}
            fill
            sizes="100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.01]"
          />
        </div>

        {/* Mobile Banner Image */}
        {mobileSrc && (
          <div className="relative h-full w-full sm:hidden">
            <Image
              src={mobileSrc}
              alt={alt}
              fill
              sizes="100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.01]"
            />
          </div>
        )}
      </Link>
    </section>
  )
}
