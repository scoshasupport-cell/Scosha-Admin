import Link from "next/link"

const SIZE = {
  sm: "text-[16px] tracking-[0.14em]",
  md: "text-[17px] tracking-[0.12em] min-[400px]:text-[20px] min-[400px]:tracking-[0.16em] sm:text-[22px] lg:text-[24px]",
  lg: "text-[26px] tracking-[0.16em] sm:text-[30px]",
} as const

const TONE = {
  dark: "text-primary-text",
  light: "text-white",
  brand: "text-brand",
} as const

export default function Logo({
  className = "",
  tone = "brand",
  size = "md",
}: {
  className?: string
  tone?: "dark" | "light" | "brand"
  size?: "sm" | "md" | "lg"
}) {
  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center self-center font-serif font-semibold uppercase leading-none transition-opacity hover:opacity-85 ${SIZE[size]} ${TONE[tone]} ${className}`}
      aria-label="Scosha Home"
    >
      SCOSHA
    </Link>
  )
}
