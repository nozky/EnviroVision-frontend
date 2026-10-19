// Sample dashboard data for EnviroVision.
//
// These are hand-written example values, not live readings. When the FastAPI
// backend is ready, replace this file's exports with API calls (the field
// names below match the station endpoints where possible).

// The date the dashboard opens on.
export const defaultForecastDate = "2026-10-24"

// The date the most recent real sample was taken.
export const latestSampleDate = "2026-10-17"

// One monitoring station and its predicted PAH level.
export type Station = {
  station_number: string
  station_name: string
  latitude: number
  longitude: number
  historical_pah_ug_l: number
  predicted_pah_ug_l: number
}

// Ten stations, so the "Total Stations" card counts the whole network and not
// just the five shown in the table. Coordinates are approximate river
// locations; swap in exact ones from the API later.
export const stations: Station[] = [
  {
    station_number: "07AA002",
    station_name: "Athabasca River at Jasper",
    latitude: 52.876,
    longitude: -118.081,
    historical_pah_ug_l: 0.13,
    predicted_pah_ug_l: 0.14,
  },
  {
    station_number: "07AA001",
    station_name: "Miette River near Jasper",
    latitude: 52.885,
    longitude: -118.115,
    historical_pah_ug_l: 0.17,
    predicted_pah_ug_l: 0.185,
  },
  {
    station_number: "07AA004",
    station_name: "Athabasca R. above Miette",
    latitude: 52.889,
    longitude: -118.135,
    historical_pah_ug_l: 0.1,
    predicted_pah_ug_l: 0.095,
  },
  {
    station_number: "07AA007",
    station_name: "Athabasca R. below Jasper",
    latitude: 52.912,
    longitude: -118.088,
    historical_pah_ug_l: 0.2,
    predicted_pah_ug_l: 0.22,
  },
  {
    station_number: "07AD002",
    station_name: "Fiddle River near mouth",
    latitude: 52.917,
    longitude: -118.172,
    historical_pah_ug_l: 0.12,
    predicted_pah_ug_l: 0.11,
  },
  {
    station_number: "07AA003",
    station_name: "Athabasca R. at Snaring",
    latitude: 52.93,
    longitude: -118.075,
    historical_pah_ug_l: 0.09,
    predicted_pah_ug_l: 0.085,
  },
  {
    station_number: "07AA005",
    station_name: "Maligne River near Jasper",
    latitude: 52.878,
    longitude: -118.045,
    historical_pah_ug_l: 0.08,
    predicted_pah_ug_l: 0.078,
  },
  {
    station_number: "07AA006",
    station_name: "Miette River above Jasper",
    latitude: 52.895,
    longitude: -118.155,
    historical_pah_ug_l: 0.095,
    predicted_pah_ug_l: 0.092,
  },
  {
    station_number: "07AA008",
    station_name: "Athabasca R. at Brule",
    latitude: 52.855,
    longitude: -118.02,
    historical_pah_ug_l: 0.11,
    predicted_pah_ug_l: 0.104,
  },
  {
    station_number: "07AD001",
    station_name: "Snake Indian River near Jasper",
    latitude: 52.94,
    longitude: -118.13,
    historical_pah_ug_l: 0.07,
    predicted_pah_ug_l: 0.072,
  },
]

// The five stations shown in the map and the table.
export const visibleStations = stations.slice(0, 5)

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
export const pahForecast = { date: "2026-10-24", pah: 0.14 }
