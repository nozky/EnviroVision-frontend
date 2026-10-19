"use client"

import { useEffect, useState } from "react"
import { Leaf } from "lucide-react"

import { ForecastMap } from "@/components/dashboard/forecast-map"
import { ForecastTable } from "@/components/dashboard/forecast-table"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PahChart } from "@/components/dashboard/pah-chart"
import { fetchHydrometricStations } from "@/lib/api"
import { defaultForecastDate, type Station } from "@/lib/dashboard-data"

export function Dashboard() {
  // The date the forecast is for. The picker changes it.
  const [forecastDate, setForecastDate] = useState(defaultForecastDate)
  // The stations fetched from the backend, or null while loading.
  const [stations, setStations] = useState<Station[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the station list once on mount.
  useEffect(() => {
    const controller = new AbortController()

    fetchHydrometricStations(controller.signal)
      .then(setStations)
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

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
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
                <ForecastMap stations={stations} forecastDate={forecastDate} />
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
