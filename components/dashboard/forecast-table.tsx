import { Loader2 } from "lucide-react"

import type { HydrocarbonPrediction, Station } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

const headers = [
  "Station",
  "Station Name",
  "Latest Sample Date",
  "Historical PAH (µg/L)",
  "Forecast Date",
  "Predicted PAH (µg/L)",
  "Change",
  "Status",
]

// Number columns are centred; the first two sit on the left.
const centered = new Set([2, 3, 4, 5, 6, 7])

// Shown wherever a value has no API source yet (PAH and sample dates).
const BLANK = "—"

function formatDate(date: string) {
  // "2026-10-17" -> "Oct 17, 2026". Formatting in UTC keeps the day from
  // slipping back one in Alberta's time zone.
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date))
}

type ForecastTableProps = {
  stations: Station[]
  forecastDate: string
  // Tells the dashboard which row the user clicked.
  onSelectStation?: (station: Station) => void
  // The station the dashboard has selected, plus its data.
  selectedStation: Station | null
  prediction: HydrocarbonPrediction | null
  predictionLoading: boolean
}

export function ForecastTable({
  stations,
  forecastDate,
  onSelectStation,
  selectedStation,
  prediction,
  predictionLoading,
}: ForecastTableProps) {
  return (
    <section className="rounded-xl border border-card-edge bg-card shadow-sm">
      <header className="p-5 pb-3">
        <h2 className="text-base font-semibold text-navy">
          Latest Reading and 7-Day Forecast
        </h2>
        <p className="text-sm text-slate">
          PAH concentration (µg/L) for {formatDate(forecastDate)}
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-220 border-t border-card-edge text-sm">
          <thead className="bg-table-head text-xs text-navy">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={cn(
                    "px-3 py-2.5 font-semibold",
                    centered.has(index) ? "text-center" : "text-left"
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              // Is this the row the user picked?
              const isSelected =
                selectedStation?.station_number === station.station_number
              const cardPrediction = isSelected ? prediction : null
              // The newest day in the series is the "latest" one.
              const latest =
                cardPrediction?.data[cardPrediction.data.length - 1]

              const change =
                latest?.actual != null && latest.predicted != null
                  ? latest.predicted - latest.actual
                  : null
              // A simple rule: predicting more than we measured is elevated.
              const status =
                change == null ? BLANK : change > 0 ? "Elevated" : "Normal"

              return (
                <tr
                  key={station.station_number}
                  // Clicking a row picks that station, same as a map marker.
                  onClick={() => onSelectStation?.(station)}
                  // Keyboard users can press Enter or Space to pick it too.
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onSelectStation?.(station)
                    }
                  }}
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-busy={isSelected && predictionLoading}
                  className={cn(
                    "cursor-pointer border-b border-card-edge last:border-0 hover:bg-table-head/60 focus-visible:outline-2 focus-visible:outline-brand-blue",
                    isSelected && "bg-table-head"
                  )}
                >
                  <td className="px-3 py-3 font-medium text-navy">
                    <span className="flex items-center gap-2">
                      {station.station_number}
                      {isSelected && predictionLoading && (
                        <Loader2 className="size-3.5 animate-spin text-brand-blue" />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-navy">{station.station_name}</td>
                  <td className="px-3 py-3 text-center text-navy">
                    {latest ? formatDate(latest.sample_datetime) : BLANK}
                  </td>
                  <td className="px-3 py-3 text-center text-navy tabular-nums">
                    {latest?.actual != null ? latest.actual.toFixed(4) : BLANK}
                  </td>
                  <td className="px-3 py-3 text-center text-navy">
                    {formatDate(forecastDate)}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-navy tabular-nums">
                    {isSelected && predictionLoading && !latest ? (
                      <Loader2 className="mx-auto size-3.5 animate-spin text-brand-blue" />
                    ) : latest?.predicted != null ? (
                      latest.predicted.toFixed(4)
                    ) : (
                      BLANK
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-navy tabular-nums">
                    {change != null
                      ? `${change >= 0 ? "+" : ""}${change.toFixed(4)}`
                      : BLANK}
                  </td>
                  <td className="px-3 py-3 text-center text-navy">{status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
