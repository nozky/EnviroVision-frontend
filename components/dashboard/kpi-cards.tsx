import { Activity, CheckCircle2, MapPin, TriangleAlert } from "lucide-react"

import type { Station, StatusThresholds } from "@/lib/dashboard-data"

type KpiCardsProps = {
  stations: Station[]
  // How many stations the numbers put in each guideline band.
  highCount: number
  mediumCount: number
  normalCount: number
  // The fixed guideline cut-offs the statuses were read against.
  thresholds: StatusThresholds
}

// Three decimal places is enough to tell the guideline bands apart.
function formatThreshold(value: number) {
  return value.toFixed(3)
}

export function KpiCards({
  stations,
  highCount,
  mediumCount,
  normalCount,
  thresholds,
}: KpiCardsProps) {
  const cards = [
    {
      label: "Total Stations",
      value: String(stations.length),
      detail: "Network-wide",
      icon: MapPin,
      iconClass: "bg-brand-blue-soft text-brand-blue",
      valueClass: "text-navy",
    },
    {
      label: "High Risk",
      value: String(highCount),
      detail: `> ${formatThreshold(thresholds.guideline)}`,
      icon: TriangleAlert,
      iconClass: "bg-warn-soft text-warn",
      valueClass: "text-warn",
    },
    {
      label: "Medium Risk",
      value: String(mediumCount),
      detail: `${formatThreshold(thresholds.medium)} – ${formatThreshold(thresholds.guideline)}`,
      icon: Activity,
      iconClass: "bg-forecast-soft text-forecast",
      valueClass: "text-forecast",
    },
    {
      label: "Normal",
      value: String(normalCount),
      detail: `≤ ${formatThreshold(thresholds.medium)}`,
      icon: CheckCircle2,
      iconClass: "bg-good-soft text-good",
      valueClass: "text-good",
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-lg border border-card-edge bg-card px-3 py-2 shadow-sm"
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${card.iconClass}`}
          >
            <card.icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className={`text-lg font-bold leading-none ${card.valueClass}`}>
                {card.value}
              </p>
              <p className="truncate text-xs font-medium text-slate">
                {card.label}
              </p>
            </div>
            <p className="truncate text-[11px] tabular-nums text-slate/80">
              {card.detail}
              <span className="ml-0.5">µg/L</span>
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
