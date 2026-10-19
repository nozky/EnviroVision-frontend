import {
  changePercent,
  latestSampleDate,
  riskStatus,
  visibleStations,
} from "@/lib/dashboard-data"
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
  forecastDate: string
}

export function ForecastTable({ forecastDate }: ForecastTableProps) {
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
            {visibleStations.map((station) => {
              const change = changePercent(
                station.historical_pah_ug_l,
                station.predicted_pah_ug_l
              )
              const status = riskStatus(station.predicted_pah_ug_l)

              return (
                <tr
                  key={station.station_number}
                  className="border-b border-card-edge last:border-0"
                >
                  <td className="px-3 py-3 font-medium text-navy">
                    {station.station_number}
                  </td>
                  <td className="px-3 py-3 text-navy">
                    {station.station_name}
                  </td>
                  <td className="px-3 py-3 text-center text-navy">
                    {formatDate(latestSampleDate)}
                  </td>
                  <td className="px-3 py-3 text-center text-navy tabular-nums">
                    {station.historical_pah_ug_l.toFixed(3)}
                  </td>
                  <td className="px-3 py-3 text-center text-navy">
                    {formatDate(forecastDate)}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-navy tabular-nums">
                    {station.predicted_pah_ug_l.toFixed(3)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-center font-medium tabular-nums",
                      change >= 0 ? "text-rise" : "text-drop"
                    )}
                  >
                    {`${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-1 text-xs font-medium",
                        status === "Normal"
                          ? "bg-drop-soft text-drop"
                          : status === "Elevated"
                            ? "bg-rise-soft text-rise"
                            : "bg-forecast/10 text-forecast"
                      )}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
