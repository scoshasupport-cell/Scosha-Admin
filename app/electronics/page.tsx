"use client"

import { Headphones, Watch, Smartphone } from "lucide-react"
import { ComingSoonPage } from "@/components/site/coming-soon-page"

export default function ElectronicsComingSoonPage() {
  return (
    <ComingSoonPage
      title="Electronics"
      eyebrow="Tech lab · Coming soon"
      description="Lifestyle electronics, wireless audio, wearables, and everyday tech essentials — launching soon with early access for Scosha waitlist members."
      features={[
        {
          icon: Headphones,
          title: "Sound",
          body: "Noise-cancelling headphones, true wireless earbuds, and compact speakers.",
        },
        {
          icon: Watch,
          title: "Wearables",
          body: "Smart watches and bands for daily tracking without the clutter.",
        },
        {
          icon: Smartphone,
          title: "Everyday tech",
          body: "Chargers, docks, cables, and cases that keep pace with your routine.",
        },
      ]}
      shopLabel="Shop Clothes & Winter collection"
    />
  )
}
