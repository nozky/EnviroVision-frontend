"use client"

import { useEffect, useState } from "react"
import { Leaf } from "lucide-react"

import { ForecastMap } from "@/components/dashboard/forecast-map"
import { ForecastTable } from "@/components/dashboard/forecast-table"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PahChart } from "@/components/dashboard/pah-chart"
import { fetchHydrometricStations } from "@/lib/api"
import {
  defaultForecastDate,
  riskStatus,
  withPlaceholderPah,
  type Station,
} from "@/lib/dashboard-data"
import { riskColors } from "@/lib/dashboard-colors"

export function Dashboard() {
  // The date the forecast is for. The picker changes it.
  const [forecastDate, setForecastDate] = useState(defaultForecastDate)
  // The station whose marker was clicked, shown in the map card.
  const [selected, setSelected] = useState<Station | null>(null)
  // The stations fetched from the backend, or null while loading.
  const [stations, setStations] = useState<Station[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the station list once on mount.
  useEffect(() => {
    const controller = new AbortController()

    fetchHydrometricStations(controller.signal)
      .then((apiStations) => setStations(apiStations.map(withPlaceholderPah)))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setError("Could not load stations. Please try again later.")
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen bg-page p-8 text-navy">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-good-soft">
            <Leaf className="size-6 text-good" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-navy">EnviroVision</h1>
            <p className="text-sm text-slate">
              Environmental Monitoring &amp; Forecasting
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate">
          Forecast date
          <input
            type="date"
            value={forecastDate}
            onChange={(event) => setForecastDate(event.target.value)}
            className="rounded-lg border border-card-edge bg-card px-3 py-2 text-sm text-navy shadow-sm outline-none focus:border-brand-blue"
          />
        </label>
      </header>

      {error && (
        <div className="rounded-xl border border-card-edge bg-card p-5 text-sm text-slate shadow-sm">
          {error}
        </div>
      )}

      {!error && !stations && (
        <div className="rounded-xl border border-card-edge bg-card p-5 text-sm text-slate shadow-sm">
          Loading stations…
        </div>
      )}

      {stations && (
        <>
          <KpiCards stations={stations} />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)]">
            <section className="flex flex-col rounded-xl border border-card-edge bg-card shadow-sm">
              <header className="p-5 pb-3">
                <h2 className="text-base font-semibold text-navy">
                  Predicted PAH Concentration (µg/L)
                </h2>
                <p className="text-sm text-slate">
                  7-day forecast for Jasper area
                </p>
              </header>
              <div className="relative h-105 flex-1 overflow-hidden rounded-b-xl">
                <ForecastMap
                  stations={stations}
                  onSelectStation={setSelected}
                />

                {/* Risk legend, bottom-left of the map. */}
                <div className="absolute bottom-4 left-4 rounded-lg border border-card-edge bg-card/95 p-3 text-xs shadow-md">
                  <p className="mb-2 font-medium text-navy">
                    Predicted PAH (µg/L)
                  </p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: riskColors.Elevated }}
                      />
                      &gt; 0.15 (Elevated)
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: riskColors.Moderate }}
                      />
                      0.10 – 0.15 (Moderate)
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: riskColors.Normal }}
                      />
                      &lt; 0.10 (Normal)
                    </li>
                  </ul>
                </div>

                {/* Details for the marker that was clicked. */}
                {selected && (
                  <div className="absolute top-4 left-4 rounded-lg border border-card-edge bg-card/95 p-3 text-xs shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-navy">
                        {selected.station_name}
                      </p>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-slate hover:text-navy"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-1 text-slate">
                      Station {selected.station_number}
                    </p>
                    <p className="mt-1">
                      Predicted PAH:{" "}
                      <span className="font-medium tabular-nums">
                        {selected.predicted_pah_ug_l.toFixed(3)} µg/L
                      </span>
                    </p>
                    <p>
                      Forecast date:{" "}
                      <span className="font-medium">{forecastDate}</span>
                    </p>
                    <p>
                      Status:{" "}
                      <span className="font-medium">
                        {riskStatus(selected.predicted_pah_ug_l)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </section>

            <ForecastTable stations={stations} forecastDate={forecastDate} />
          </div>
        </>
      )}

      <div className="mt-4">
        <PahChart />
      </div>
    </main>
  )
}
