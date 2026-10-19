import { CheckCircle2, MapPin, TriangleAlert } from "lucide-react"

import { riskStatus, stations } from "@/lib/dashboard-data"

// Counts are worked out from the whole station list, not just the five rows
// shown in the table.
const total = stations.length
const elevated = stations.filter(
  (station) => riskStatus(station.predicted_pah_ug_l) === "Elevated"
).length
const normal = stations.filter(
  (station) => riskStatus(station.predicted_pah_ug_l) === "Normal"
).length

const cards = [
  {
    label: "Total Stations",
    value: total,
    icon: MapPin,
    iconClass: "bg-brand-blue-soft text-brand-blue",
  },
  {
    label: "Elevated Risk",
    value: elevated,
    icon: TriangleAlert,
    iconClass: "bg-warn-soft text-warn",
  },
  {
    label: "Normal",
    value: normal,
    icon: CheckCircle2,
    iconClass: "bg-good-soft text-good",
  },
]

export function KpiCards() {
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
