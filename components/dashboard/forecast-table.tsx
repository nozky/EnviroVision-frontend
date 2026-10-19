import type { Station } from "@/lib/dashboard-data"
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
}

export function ForecastTable({ stations, forecastDate }: ForecastTableProps) {
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
            {stations.map((station) => (
              <tr
                key={station.station_number}
                className="border-b border-card-edge last:border-0"
              >
                <td className="px-3 py-3 font-medium text-navy">
                  {station.station_number}
                </td>
                <td className="px-3 py-3 text-navy">{station.station_name}</td>
                {/* PAH values and sample dates have no API source yet. */}
                <td className="px-3 py-3 text-center text-slate">{BLANK}</td>
                <td className="px-3 py-3 text-center text-slate tabular-nums">
                  {BLANK}
                </td>
                <td className="px-3 py-3 text-center text-navy">
                  {formatDate(forecastDate)}
                </td>
                <td className="px-3 py-3 text-center font-medium text-slate tabular-nums">
                  {BLANK}
                </td>
                <td className="px-3 py-3 text-center text-slate tabular-nums">
                  {BLANK}
                </td>
                <td className="px-3 py-3 text-center text-slate">{BLANK}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
