import { CheckCircle2, MapPin, TriangleAlert } from "lucide-react"

import type { Station } from "@/lib/dashboard-data"

type KpiCardsProps = {
  stations: Station[]
  // How many stations the numbers mark as elevated or normal.
  elevatedCount: number
  normalCount: number
}

export function KpiCards({
  stations,
  elevatedCount,
  normalCount,
}: KpiCardsProps) {
  const cards = [
    {
      label: "Total Stations",
      value: stations.length,
      icon: MapPin,
      iconClass: "bg-brand-blue-soft text-brand-blue",
    },
    {
      label: "Elevated Risk",
      value: elevatedCount,
      icon: TriangleAlert,
      iconClass: "bg-warn-soft text-warn",
    },
    {
      label: "Normal",
      value: normalCount,
      icon: CheckCircle2,
      iconClass: "bg-good-soft text-good",
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-4 rounded-xl border border-card-edge bg-card p-5 shadow-sm"
        >
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${card.iconClass}`}
          >
            <card.icon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate">{card.label}</p>
            <p className="text-2xl font-bold text-navy">{card.value}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
