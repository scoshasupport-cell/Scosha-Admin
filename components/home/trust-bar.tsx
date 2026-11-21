import { Truck, RefreshCw, ShieldCheck, Ruler } from "lucide-react"

const ITEMS = [
  { icon: Truck, title: "Fast & Reliable Delivery", text: "Worldwide & Local" },
  { icon: RefreshCw, title: "Easy Returns", text: "14 Days" },
  { icon: ShieldCheck, title: "Secure Payment", text: "Shop with Confidence" },
  { icon: Ruler, title: "AI Size Scan", text: "Find Your Perfect Fit" },
]

export function TrustBar() {
  return (
    <section className="border-b border-border-subtle bg-white">
      <div className="store-container grid grid-cols-2 gap-4 py-5 md:grid-cols-4 md:gap-6 md:py-6">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: "#7A1F2B" }}
            >
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-text sm:text-xs">
                {title}
              </p>
              <p className="mt-0.5 text-[11px] text-subtext">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
