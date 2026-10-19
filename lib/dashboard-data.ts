// Dashboard data for EnviroVision.
//
// Station records are fetched live from the backend (see lib/api.ts). This file
// holds the shared types and the few values that still have no API source.

// The date the dashboard opens on.
export const defaultForecastDate = "2026-10-24"

// The station the dashboard shows first, before the user clicks anything.
export const defaultStationNumber = "07AA002"

// How many days of data we ask the backend for.
export const defaultPredictionLimit = 7

// One station as returned by GET /api/v1/get-hydrometric-stations/.
export type ApiStation = {
  station_number: string
  station_name: string
  watercourse: string
  latitude: number
  longitude: number
  srid: number
  geom: {
    type: string
    crs: { type: string; properties: { name: string } }
    coordinates: [number, number]
  }
  gross_drainage_area_km2: number | null
  effective_drainage_area_km2: number | null
  station_type: string
  area_role: string
  metadata_source: string
  source_url: string
  notes: string
}

// The UI displays stations straight from the API. The API has no PAH
// (predicted/historical) values yet, so those are shown as blank until a
// measurement/forecast endpoint exists.
export type Station = ApiStation

// Weekly PAH readings for station 07AA002, used by the bottom chart.
// TODO: placeholder until a PAH/reading endpoint exists.
export const pahHistory = [
  { date: "2026-09-05", pah: 0.1 },
  { date: "2026-09-12", pah: 0.125 },
  { date: "2026-09-19", pah: 0.155 },
  { date: "2026-09-26", pah: 0.135 },
  { date: "2026-10-03", pah: 0.112 },
  { date: "2026-10-10", pah: 0.123 },
  { date: "2026-10-17", pah: 0.132 },
]

// The single seven-day forecast point that continues the history above.
// TODO: placeholder until a PAH/forecast endpoint exists.
export const pahForecast = { date: "2026-10-24", pah: 0.14 }

// One day of a prediction series: the value that was measured and the value
// the model guessed for that same day. Either can be missing (null), so we
// check before showing a number.
export type PredictionPoint = {
  sample_datetime: string
  actual: number | null
  predicted: number | null
}

// The full reply from GET /api/v1/station/{station}/predict-hydrocarbon.
// `station_number` tells us which station the rows belong to, and `data` holds
// one entry per day.
export type HydrocarbonPrediction = {
  station_number: string
  data: PredictionPoint[]
}

// How a station looks at a glance. "unknown" means we have not loaded its
// numbers yet, or the numbers were missing.
export type StationStatus = "elevated" | "normal" | "unknown"

// The last day in a prediction series, or null when there is nothing to read.
export function latestPoint(
  prediction: HydrocarbonPrediction | null | undefined
): PredictionPoint | null {
  if (!prediction || prediction.data.length === 0) return null
  return prediction.data[prediction.data.length - 1]
}

// Work out a station's status from its numbers. This is a simple rule: when the
// model predicts more than was actually measured, we call it elevated. Swap
// this for a real guideline threshold later if one is decided.
export function getStationStatus(
  prediction: HydrocarbonPrediction | null | undefined
): StationStatus {
  const point = latestPoint(prediction)
  if (!point || point.actual == null || point.predicted == null) return "unknown"
  return point.predicted > point.actual ? "elevated" : "normal"
}

// The label to show, the canvas colour for the map marker, and the CSS classes
// for on-page badges. The map colours are fixed hex because canvas paint cannot
// read CSS variables.
export const STATUS_META: Record<
  StationStatus,
  { label: string; color: string; softClass: string; textClass: string }
> = {
  elevated: {
    label: "Elevated",
    color: "#fd2e2e",
    softClass: "bg-warn-soft",
    textClass: "text-warn",
  },
  normal: {
    label: "Normal",
    color: "#029c4b",
    softClass: "bg-good-soft",
    textClass: "text-good",
  },
  unknown: {
    label: "Unknown",
    color: "#0287f4",
    softClass: "bg-brand-blue-soft",
    textClass: "text-brand-blue",
  },
}
