"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Leaf } from "lucide-react"

import { ForecastMap } from "@/components/dashboard/forecast-map"
import { ForecastTable } from "@/components/dashboard/forecast-table"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PahChart } from "@/components/dashboard/pah-chart"
import { fetchHydrocarbonPrediction, fetchHydrometricStations } from "@/lib/api"
import {
  defaultForecastDate,
  defaultPredictionLimit,
  defaultStationNumber,
  type HydrocarbonPrediction,
  type Station,
} from "@/lib/dashboard-data"

export function Dashboard() {
  // The date the forecast is for. The picker changes it.
  const [forecastDate, setForecastDate] = useState(defaultForecastDate)
  // The stations fetched from the backend, or null while loading.
  const [stations, setStations] = useState<Station[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The station the user picked (from the map or the list).
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  // The numbers we got back for that station, or null while we wait.
  const [prediction, setPrediction] = useState<HydrocarbonPrediction | null>(null)
  // True while a prediction request is in flight, so we can show a spinner.
  const [predictionLoading, setPredictionLoading] = useState(false)
  const [predictionError, setPredictionError] = useState<string | null>(null)

  // Remembers the prediction request so we can cancel it. If the user clicks a
  // new station before the old reply arrives, we drop the old one.
  const predictionController = useRef<AbortController | null>(null)

  // Runs when the user clicks a station on the map or in the list.
  const selectStation = useCallback((station: Station) => {
    // Cancel any older request so it can't overwrite the newer result.
    predictionController.current?.abort()
    const controller = new AbortController()
    predictionController.current = controller

    setSelectedStation(station)
    setPredictionLoading(true)
    setPredictionError(null)
    // Clear the old numbers so the spinner is the only thing showing.
    setPrediction(null)

    fetchHydrocarbonPrediction(
      station.station_number,
      defaultPredictionLimit,
      controller.signal
    )
      .then(setPrediction)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setPredictionError("Could not load predictions for this station.")
      })
      .finally(() => {
        // Only stop the spinner if this is still the newest request.
        if (!controller.signal.aborted) setPredictionLoading(false)
      })
  }, [])

  // Load the station list once on mount.
  useEffect(() => {
    const controller = new AbortController()

    fetchHydrometricStations(controller.signal)
      .then((list) => {
        setStations(list)
        // Show a station right away instead of an empty screen. Prefer the
        // default station, but fall back to the first one in the list.
        const first =
          list.find(
            (station) => station.station_number === defaultStationNumber
          ) ?? list[0]
        if (first) selectStation(first)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setError("Could not load stations. Please try again later.")
      })

    return () => {
      controller.abort()
      predictionController.current?.abort()
    }
  }, [selectStation])

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
                <ForecastMap
                  stations={stations}
                  forecastDate={forecastDate}
                  onSelectStation={selectStation}
                  selectedStation={selectedStation}
                  prediction={prediction}
                  predictionLoading={predictionLoading}
                  predictionError={predictionError}
                />
              </div>
            </section>

            <ForecastTable
              stations={stations}
              forecastDate={forecastDate}
              onSelectStation={selectStation}
              selectedStation={selectedStation}
              prediction={prediction}
              predictionLoading={predictionLoading}
            />
          </div>
        </>
      )}

      <div className="mt-4">
        <PahChart
          prediction={prediction}
          loading={predictionLoading}
          error={predictionError}
          stationNumber={selectedStation?.station_number ?? null}
        />
      </div>
    </main>
  )
}
