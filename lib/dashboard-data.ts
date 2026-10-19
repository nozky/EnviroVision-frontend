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

// How a station looks at a glance, based on the Canadian long-term aquatic-life
// guideline for PAH (0.015 µg/L).
export type StationStatus = "normal" | "medium" | "high"

// The guideline values the status is read against.
//
// The long-term aquatic-life guideline is 0.015 µg/L. Anything at or below
// 0.010 µg/L is comfortably below it, so we call that normal; above 0.010 up to
// 0.015 is approaching the guideline, so we call that medium; above 0.015 has
// crossed the guideline, so we call that high.
export const PAH_GUIDELINE_UG_PER_L = 0.015
export const PAH_MEDIUM_CUTOFF_UG_PER_L = 0.01

// The last day in a prediction series, or null when there is nothing to read.
export function latestPoint(
  prediction: HydrocarbonPrediction | null | undefined
): PredictionPoint | null {
  if (!prediction || prediction.data.length === 0) return null
  return prediction.data[prediction.data.length - 1]
}

// The cut-offs every station is read against, kept in one place so the KPI cards
// and the status rule cannot drift apart. Unlike the old min/max spreading, these
// are fixed guideline values rather than something derived from the data.
export type StatusThresholds = {
  medium: number
  guideline: number
}

export const STATUS_THRESHOLDS: StatusThresholds = {
  medium: PAH_MEDIUM_CUTOFF_UG_PER_L,
  guideline: PAH_GUIDELINE_UG_PER_L,
}

// Work out a station's status from its latest predicted value, read against the
// guideline bands above:
//   <= 0.010          -> normal  (below the guideline, with a margin)
//   > 0.010 to 0.015  -> medium  (approaching the guideline)
//   > 0.015           -> high    (guideline exceeded)
// Before any numbers load, or when the value is missing, we treat it as normal
// so nothing is flagged without evidence.
export function getStationStatus(
  prediction: HydrocarbonPrediction | null | undefined
): StationStatus {
  const point = latestPoint(prediction)
  if (!point || point.predicted == null) return "normal"
  if (point.predicted > STATUS_THRESHOLDS.guideline) return "high"
  if (point.predicted > STATUS_THRESHOLDS.medium) return "medium"
  return "normal"
}

// The label to show, the canvas colour for the map marker, and the CSS classes
// for on-page badges. The map colours are fixed hex because canvas paint cannot
// read CSS variables.
export const STATUS_META: Record<
  StationStatus,
  { label: string; color: string; softClass: string; textClass: string }
> = {
  high: {
    label: "High",
    color: "#fd2e2e",
    softClass: "bg-warn-soft",
    textClass: "text-warn",
  },
  medium: {
    label: "Medium",
    color: "#a55701",
    softClass: "bg-forecast-soft",
    textClass: "text-forecast",
  },
  normal: {
    label: "Normal",
    color: "#029c4b",
    softClass: "bg-good-soft",
    textClass: "text-good",
  },
}
