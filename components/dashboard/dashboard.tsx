"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Leaf, PanelRight } from "lucide-react"

import {
  ChartViewToggle,
  type ChartView,
} from "@/components/dashboard/chart-view-toggle"
import { ForecastMap } from "@/components/dashboard/forecast-map"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PahChart } from "@/components/dashboard/pah-chart"
import { PahForecastChart } from "@/components/dashboard/pah-forecast-chart"
import { StationDetail } from "@/components/dashboard/station-detail"
import {
  fetchHydrocarbonPrediction,
  fetchHydrometricStations,
  fetchWatershed,
} from "@/lib/api"
import {
  defaultPredictionLimit,
  defaultStationNumber,
  getStationStatus,
  STATUS_THRESHOLDS,
  type HydrocarbonPrediction,
  type Station,
  type StationStatus,
  type WatershedResponse,
} from "@/lib/dashboard-data"

// How many records we ask the backend for per station. The input edits a
// draft; the committed number only changes on blur or Enter so we do not
// re-fetch for every keystroke.
const MIN_PREDICTION_LIMIT = 1
const MAX_PREDICTION_LIMIT = 100

export function Dashboard() {
  const [predictionLimit, setPredictionLimit] = useState(defaultPredictionLimit)
  const [limitDraft, setLimitDraft] = useState(String(defaultPredictionLimit))
  // Which of the two charts at the bottom is on show. The forecast comes
  // first; the choice is kept while the user moves between stations.
  const [chartView, setChartView] = useState<ChartView>("forecast")
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

  // Watershed data for the currently selected station.
  const [watershed, setWatershed] = useState<WatershedResponse | null>(null)
  const [watershedLoading, setWatershedLoading] = useState(false)
  const [watershedError, setWatershedError] = useState<string | null>(null)

  // Try a single station again after a failed load.
  const retryStation = useCallback(
    async (stationNumber: string) => {
      // Drop the value so the UI shows "loading" for this station again.
      setPredictions((prev) => {
        const next = { ...prev }
        delete next[stationNumber]
        return next
      })

      try {
        const data = await fetchHydrocarbonPrediction(
          stationNumber,
          predictionLimit
        )
        setPredictions((prev) => ({ ...prev, [stationNumber]: data }))
      } catch {
        setPredictions((prev) => ({ ...prev, [stationNumber]: null }))
      }
    },
    [predictionLimit]
  )

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

  // As soon as the stations arrive (or the record limit changes), ask for
  // every station's numbers at once so all the markers can be coloured.
  useEffect(() => {
    if (!stations) return
    const controller = new AbortController()

    const loadAll = async () => {
      const pairs = await Promise.all(
        stations.map(async (station) => {
          try {
            const data = await fetchHydrocarbonPrediction(
              station.station_number,
              predictionLimit,
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
  }, [stations, predictionLimit])

  // Load the selected station's watershed whenever the selection changes.
  useEffect(() => {
    if (!selectedStation) return

    const controller = new AbortController()

    const load = async () => {
      setWatershedLoading(true)
      setWatershedError(null)
      setWatershed(null)

      try {
        const data = await fetchWatershed(selectedStation.station_number, {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setWatershed(data)
      } catch (cause: unknown) {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setWatershedError("Could not load watershed data.")
      } finally {
        if (!controller.signal.aborted) setWatershedLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [selectedStation])

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

  // Station list for the drawer's dropdown, sorted by name.
  const stationOptions = useMemo(
    () =>
      [...(stations ?? [])].sort((a, b) =>
        a.station_name.localeCompare(b.station_name)
      ),
    [stations]
  )

  const highCount = Object.values(statuses).filter(
    (status) => status === "high"
  ).length
  const mediumCount = Object.values(statuses).filter(
    (status) => status === "medium"
  ).length
  const normalCount = Object.values(statuses).filter(
    (status) => status === "normal"
  ).length

  // Apply what's in the box: clamp it, keep the current value when it isn't
  // a usable number, and only bump state (and so re-fetch) when it changed.
  const commitLimit = useCallback(() => {
    const parsed = Number.parseInt(limitDraft, 10)
    if (!Number.isFinite(parsed)) {
      setLimitDraft(String(predictionLimit))
      return
    }
    const clamped = Math.min(
      MAX_PREDICTION_LIMIT,
      Math.max(MIN_PREDICTION_LIMIT, parsed)
    )
    setLimitDraft(String(clamped))
    setPredictionLimit((current) => (clamped === current ? current : clamped))
  }, [limitDraft, predictionLimit])

  // The numbers for the station currently shown, if we have them yet.
  const selectedPrediction = selectedStation
    ? predictions[selectedStation.station_number]
    : undefined
  const selectedLoading =
    selectedStation !== null && selectedPrediction === undefined
  const selectedError =
    selectedPrediction === null
      ? "Could not load predictions for this station."
      : null

  // Shared by both charts so the switch between them keeps one control.
  const chartToggle = (
    <ChartViewToggle view={chartView} onViewChange={setChartView} />
  )

  const [detailOpen, setDetailOpen] = useState(true)
  const [chartOpen, setChartOpen] = useState(true)

  // Trigger a map resize after floating panels animate open/closed.
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"))
    })
    return () => cancelAnimationFrame(handle)
  }, [detailOpen, chartOpen])

  return (
    <main className="fixed inset-0 overflow-hidden bg-page text-navy">
      {error && (
        <div className="absolute top-16 right-4 left-4 z-50 rounded-xl border border-card-edge bg-card p-4 text-sm text-slate shadow-lg">
          {error}
        </div>
      )}

      {!error && !stations && (
        <div className="absolute top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-card-edge bg-card p-4 text-sm text-slate shadow-lg">
          Loading stations…
        </div>
      )}

      {stations && (
        <>
          {/* Top-left floating header + KPIs. */}
          <header className="absolute top-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-col gap-2 lg:max-w-2xl">
            <div className="flex items-center gap-2.5 rounded-xl border border-card-edge bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
              <span className="flex size-8 items-center justify-center rounded-full bg-good-soft">
                <Leaf className="size-4 text-good" />
              </span>
              <div>
                <h1 className="text-base leading-tight font-bold text-navy">
                  EnviroVision
                </h1>
                <p className="text-[10px] text-slate">
                  Environmental Monitoring &amp; Forecasting
                </p>
              </div>
            </div>

            <KpiCards
              stations={stations}
              highCount={highCount}
              mediumCount={mediumCount}
              normalCount={normalCount}
              thresholds={STATUS_THRESHOLDS}
            />
          </header>

          {/* Top-right floating record limit. */}
          <label className="absolute top-4 right-4 z-20 flex flex-col gap-0.5 rounded-xl border border-card-edge bg-card/95 px-3 py-2 text-xs font-medium text-slate shadow-md backdrop-blur-sm">
            Records to show
            <input
              type="number"
              min={MIN_PREDICTION_LIMIT}
              max={MAX_PREDICTION_LIMIT}
              value={limitDraft}
              onChange={(event) => setLimitDraft(event.target.value)}
              onBlur={commitLimit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur()
                }
              }}
              className="w-20 rounded-lg border border-card-edge bg-card px-2 py-1 text-sm text-navy shadow-sm outline-none focus:border-brand-blue"
            />
          </label>

          {/* Full-screen map. */}
          <div className="absolute inset-0">
            <ForecastMap
              stations={stations}
              onSelectStation={selectStation}
              selectedStation={selectedStation}
              statuses={statuses}
              selectedPrediction={selectedPrediction}
              selectedLoading={selectedLoading}
              selectedError={selectedError}
              watershed={watershed}
            />
          </div>

          {/* Right-side station detail panel. */}
          <aside
            className={`absolute top-[5.5rem] right-4 bottom-4 z-20 flex w-[min(360px,80vw)] flex-col rounded-xl border border-card-edge bg-card/95 shadow-lg backdrop-blur-sm transition-transform duration-200 ${
              detailOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-card-edge px-3 py-2">
              <span className="text-xs font-semibold text-slate">Station</span>
              <button
                onClick={() => setDetailOpen(false)}
                className="rounded-md p-1 text-slate hover:bg-table-head"
                aria-label="Close station detail"
              >
                <PanelRight className="size-4" />
              </button>
            </div>
            <div className="border-b border-card-edge px-3 py-2">
              <label className="flex flex-col gap-0.5 text-xs font-medium text-slate">
                Choose station
                <select
                  value={selectedStation?.station_number ?? ""}
                  onChange={(event) => {
                    const station = stationOptions.find(
                      (item) => item.station_number === event.target.value
                    )
                    if (station) selectStation(station)
                  }}
                  className="w-full rounded-lg border border-card-edge bg-card px-2 py-1.5 text-sm text-navy shadow-sm outline-none focus:border-brand-blue"
                >
                  {!selectedStation && (
                    <option value="" disabled>
                      Select a station
                    </option>
                  )}
                  {stationOptions.map((station) => (
                    <option
                      key={station.station_number}
                      value={station.station_number}
                    >
                      {station.station_name} ({station.station_number})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
                onRetry={() => {
                  if (selectedStation)
                    void retryStation(selectedStation.station_number)
                }}
                watershed={watershed}
                watershedLoading={watershedLoading}
                watershedError={watershedError}
              />
            </div>
          </aside>

          {/* Tab to reopen the detail panel. */}
          {!detailOpen && (
            <button
              onClick={() => setDetailOpen(true)}
              className="absolute top-[5.5rem] right-4 z-20 flex items-center gap-1.5 rounded-l-xl border border-r-0 border-card-edge bg-card/95 px-3 py-2 text-xs font-semibold text-navy shadow-md backdrop-blur-sm"
              aria-label="Open station detail"
            >
              <PanelRight className="size-4" />
              Station
            </button>
          )}

          {/* Bottom chart drawer. */}
          <div
            className={`absolute right-4 left-4 z-20 flex flex-col rounded-t-xl border border-b-0 border-card-edge bg-card/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-transform duration-200 lg:left-auto lg:w-[min(720px,calc(100%-2rem))] ${
              chartOpen
                ? "bottom-0 translate-y-0"
                : "bottom-0 translate-y-[calc(100%-2.25rem)]"
            } ${detailOpen ? "lg:right-[calc(min(360px,80vw)_+_2rem)]" : "lg:right-4"}`}
          >
            <button
              onClick={() => setChartOpen((open) => !open)}
              className="flex items-center justify-between rounded-t-xl px-3 py-2 text-xs font-semibold text-navy hover:bg-table-head"
              aria-expanded={chartOpen}
            >
              <span>PAH Trend</span>
              {chartOpen ? (
                <ChevronDown className="size-4 text-slate" />
              ) : (
                <ChevronUp className="size-4 text-slate" />
              )}
            </button>
            <div className="relative h-[220px] w-full px-3 pb-3">
              {chartView === "forecast" ? (
                <PahForecastChart
                  prediction={selectedPrediction ?? null}
                  loading={selectedLoading}
                  error={selectedError}
                  stationNumber={selectedStation?.station_number ?? null}
                  viewToggle={chartToggle}
                />
              ) : (
                <PahChart
                  prediction={selectedPrediction ?? null}
                  loading={selectedLoading}
                  error={selectedError}
                  stationNumber={selectedStation?.station_number ?? null}
                  limit={predictionLimit}
                  viewToggle={chartToggle}
                />
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
