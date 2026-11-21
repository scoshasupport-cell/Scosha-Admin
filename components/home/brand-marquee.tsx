const BRANDS = ["Clothes", "Home", "Skincare", "Electronics"]
const ITEMS = [...BRANDS, ...BRANDS, ...BRANDS]

export function BrandMarquee() {
  return (
    <section className="border-y border-border-subtle bg-white py-5 overflow-hidden">
      <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
        Scosha Departments
      </p>
      <div className="relative flex">
        <div className="flex w-max animate-marquee items-center gap-12 whitespace-nowrap">
          {ITEMS.map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className="text-sm font-black uppercase tracking-wider text-primary-text/40 transition-all hover:text-brand cursor-default select-none"
            >
              {brand}
              <span className="ml-12 mr-0 inline-block h-1 w-1 rounded-full bg-brand/30 align-middle" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
