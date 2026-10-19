// Dashboard data for EnviroVision.
//
// Station records are fetched live from the backend (see lib/api.ts). This file
// holds the shared types and the few values that still have no API source.

// The date the dashboard opens on.
export const defaultForecastDate = "2026-10-24"

// The date the most recent real sample was taken.
// TODO: placeholder until a PAH/reading endpoint exists.
export const latestSampleDate = "2026-10-17"

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

// A monitoring station with the PAH values the UI displays. The API only
// returns station metadata (no PAH), so the PAH fields are placeholders until a
// measurement/forecast endpoint is available.
export type Station = ApiStation & {
  historical_pah_ug_l: number
  predicted_pah_ug_l: number
}

// Placeholder PAH values, keyed by station number, so each marker keeps a
// stable colour and the table keeps stable numbers while the API has no PAH.
const placeholderPah: Record<
  string,
  { historical_pah_ug_l: number; predicted_pah_ug_l: number }
> = {
  "07AA002": { historical_pah_ug_l: 0.13, predicted_pah_ug_l: 0.14 },
  "07AA001": { historical_pah_ug_l: 0.17, predicted_pah_ug_l: 0.185 },
  "07AA004": { historical_pah_ug_l: 0.1, predicted_pah_ug_l: 0.095 },
  "07AA007": { historical_pah_ug_l: 0.2, predicted_pah_ug_l: 0.22 },
  "07AA009": { historical_pah_ug_l: 0.11, predicted_pah_ug_l: 0.104 },
  "07AA003": { historical_pah_ug_l: 0.09, predicted_pah_ug_l: 0.085 },
  "07AA006": { historical_pah_ug_l: 0.095, predicted_pah_ug_l: 0.092 },
  "07AD001": { historical_pah_ug_l: 0.07, predicted_pah_ug_l: 0.072 },
  "07AD002": { historical_pah_ug_l: 0.12, predicted_pah_ug_l: 0.11 },
  "07AD011": { historical_pah_ug_l: 0.14, predicted_pah_ug_l: 0.135 },
}

// Used for any station the API returns that we have no placeholder for yet.
const FALLBACK_PAH = { historical_pah_ug_l: 0.12, predicted_pah_ug_l: 0.13 }

// Attach placeholder PAH values to a station from the API.
export function withPlaceholderPah(station: ApiStation): Station {
  const pah = placeholderPah[station.station_number] ?? FALLBACK_PAH
  return { ...station, ...pah }
}

// A risk level for a predicted PAH value (µg/L).
export type RiskStatus = "Elevated" | "Moderate" | "Normal"

export function riskStatus(predicted_pah_ug_l: number): RiskStatus {
  if (predicted_pah_ug_l > 0.15) return "Elevated"
  if (predicted_pah_ug_l > 0.1) return "Moderate"
  return "Normal"
}

// How much the prediction moved from the last real reading, as a percentage.
export function changePercent(historical: number, predicted: number): number {
  return ((predicted - historical) / historical) * 100
}

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
