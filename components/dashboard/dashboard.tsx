"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Leaf } from "lucide-react"

import { ForecastMap } from "@/components/dashboard/forecast-map"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PahChart } from "@/components/dashboard/pah-chart"
import { StationDetail } from "@/components/dashboard/station-detail"
import { fetchHydrocarbonPrediction, fetchHydrometricStations } from "@/lib/api"
import {
  defaultForecastDate,
  defaultPredictionLimit,
  defaultStationNumber,
  getStationStatus,
  STATUS_THRESHOLDS,
  type HydrocarbonPrediction,
  type Station,
  type StationStatus,
} from "@/lib/dashboard-data"

export function Dashboard() {
  // The date the forecast is for. The picker changes it.
  const [forecastDate, setForecastDate] = useState(defaultForecastDate)
  // The stations fetched from the backend, or null while loading.
  const [stations, setStations] = useState<Station[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The station the user picked on the map.
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  // Every station's numbers, kept by station number. A missing entry means we
  // are still loading it; a null value means the load failed.
  const [predictions, setPredictions] = useState<
    Partial<Record<string, HydrocarbonPrediction | null>>
  >({})
  // Lets the click handler read the newest numbers without re-creating itself.
  const predictionsRef = useRef(predictions)
  useEffect(() => {
    predictionsRef.current = predictions
  }, [predictions])

  // Try a single station again after a failed load.
  const retryStation = useCallback(async (stationNumber: string) => {
    // Drop the value so the UI shows "loading" for this station again.
    setPredictions((prev) => {
      const next = { ...prev }
      delete next[stationNumber]
      return next
    })

    try {
      const data = await fetchHydrocarbonPrediction(
        stationNumber,
        defaultPredictionLimit
      )
      setPredictions((prev) => ({ ...prev, [stationNumber]: data }))
    } catch {
      setPredictions((prev) => ({ ...prev, [stationNumber]: null }))
    }
  }, [])

  // Runs when the user clicks a station marker.
  const selectStation = useCallback(
    (station: Station) => {
      setSelectedStation(station)
      // If this station failed earlier, have another go at loading it.
      if (predictionsRef.current[station.station_number] === null) {
        void retryStation(station.station_number)
      }
    },
    [retryStation]
  )

  // Load the station list once on mount.
  useEffect(() => {
    const controller = new AbortController()

    fetchHydrometricStations(controller.signal)
      .then((list) => {
        setStations(list)
        // Pick a station to show first instead of an empty panel.
        const first =
          list.find(
            (station) => station.station_number === defaultStationNumber
          ) ?? list[0]
        if (first) setSelectedStation(first)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setError("Could not load stations. Please try again later.")
      })

    return () => controller.abort()
  }, [])

  // As soon as the stations arrive, ask for every station's numbers at once so
  // all the markers can be coloured.
  useEffect(() => {
    if (!stations) return
    const controller = new AbortController()

    const loadAll = async () => {
      const pairs = await Promise.all(
        stations.map(async (station) => {
          try {
            const data = await fetchHydrocarbonPrediction(
              station.station_number,
              defaultPredictionLimit,
              controller.signal
            )
            return [station.station_number, data] as const
          } catch {
            // One station failing should not stop the others.
            return [station.station_number, null] as const
          }
        })
      )

      if (controller.signal.aborted) return
      setPredictions((prev) => ({ ...prev, ...Object.fromEntries(pairs) }))
    }

    void loadAll()
    return () => controller.abort()
  }, [stations])

  // Pick a station to show first, once the list is in.
  useEffect(() => {
    if (!stations) return
    setSelectedStation((current) => {
      if (current) return current
      return (
        stations.find(
          (station) => station.station_number === defaultStationNumber
        ) ?? stations[0] ?? current
      )
    })
  }, [stations])

  // The status of every station, read against the fixed guideline bands.
  const statuses = useMemo(() => {
    const map: Record<string, StationStatus> = {}
    for (const station of stations ?? []) {
      map[station.station_number] = getStationStatus(
        predictions[station.station_number]
      )
    }
    return map
  }, [stations, predictions])

  const highCount = Object.values(statuses).filter(
    (status) => status === "high"
  ).length
  const mediumCount = Object.values(statuses).filter(
    (status) => status === "medium"
  ).length
  const normalCount = Object.values(statuses).filter(
    (status) => status === "normal"
  ).length

  // The numbers for the station currently shown, if we have them yet.
  const selectedPrediction = selectedStation
    ? predictions[selectedStation.station_number]
    : undefined
  const selectedLoading = selectedStation !== null && selectedPrediction === undefined
  const selectedError =
    selectedPrediction === null
      ? "Could not load predictions for this station."
      : null

  return (
    <main className="min-h-screen bg-page p-3 text-navy lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden lg:p-4">
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-good-soft">
            <Leaf className="size-5 text-good" />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight text-navy">
              EnviroVision
            </h1>
            <p className="text-xs text-slate">
              Environmental Monitoring &amp; Forecasting
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-0.5 text-xs font-medium text-slate">
          Forecast date
          <input
            type="date"
            value={forecastDate}
            onChange={(event) => setForecastDate(event.target.value)}
            className="rounded-lg border border-card-edge bg-card px-2.5 py-1.5 text-sm text-navy shadow-sm outline-none focus:border-brand-blue"
          />
        </label>
      </header>

      {error && (
        <div className="shrink-0 rounded-xl border border-card-edge bg-card p-4 text-sm text-slate shadow-sm">
          {error}
        </div>
      )}

      {!error && !stations && (
        <div className="shrink-0 rounded-xl border border-card-edge bg-card p-4 text-sm text-slate shadow-sm">
          Loading stations…
        </div>
      )}

      {stations && (
        <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
          <div className="shrink-0">
            <KpiCards
              stations={stations}
              highCount={highCount}
              mediumCount={mediumCount}
              normalCount={normalCount}
              thresholds={STATUS_THRESHOLDS}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
            <section className="flex min-h-80 flex-col rounded-xl border border-card-edge bg-card shadow-sm lg:min-h-0">
              <header className="shrink-0 px-4 pt-3 pb-2">
                <h2 className="text-sm font-semibold text-navy">
                  Predicted PAH Concentration (µg/L)
                </h2>
                <p className="text-xs text-slate">
                  7-day forecast for Jasper area
                </p>
              </header>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-xl">
                <ForecastMap
                  stations={stations}
                  forecastDate={forecastDate}
                  onSelectStation={selectStation}
                  selectedStation={selectedStation}
                  statuses={statuses}
                  selectedPrediction={selectedPrediction}
                  selectedLoading={selectedLoading}
                  selectedError={selectedError}
                />
              </div>
            </section>

            <div className="lg:min-h-0 lg:overflow-y-auto">
              <StationDetail
                station={selectedStation}
                prediction={selectedPrediction}
                status={
                  selectedStation
                    ? (statuses[selectedStation.station_number] ?? "normal")
                    : "normal"
                }
                loading={selectedLoading}
                error={selectedError}
                forecastDate={forecastDate}
                onRetry={() => {
                  if (selectedStation)
                    void retryStation(selectedStation.station_number)
                }}
              />
            </div>
          </div>

          <div className="shrink-0">
            <PahChart
              prediction={selectedPrediction ?? null}
              loading={selectedLoading}
              error={selectedError}
              stationNumber={selectedStation?.station_number ?? null}
            />
          </div>
        </div>
      )}
    </main>
  )
}
