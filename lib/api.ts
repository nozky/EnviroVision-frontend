import type {
  ApiStation,
  HydrocarbonPrediction,
  WatershedResponse,
} from "@/lib/dashboard-data"

// Base URL for backend requests. Only variables prefixed with NEXT_PUBLIC_ are
// available in client components, which is where this call is made.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// Fetch the hydrometric stations from the backend.
export async function fetchHydrometricStations(
  signal?: AbortSignal
): Promise<ApiStation[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/get-hydrometric-stations/`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }

  return response.json()
}

// Ask the backend for one station's hydrocarbon numbers: the values that were
// measured and the values the model predicted for the last `limit` days.
export async function fetchHydrocarbonPrediction(
  stationNumber: string,
  limit: number,
  signal?: AbortSignal
): Promise<HydrocarbonPrediction> {
  // The station number is part of the web address, so escape it first. This
  // keeps unusual characters from breaking the request.
  const path = `/api/v1/station/${encodeURIComponent(stationNumber)}/predict-hydrocarbon`
  // The limit travels as a query value ("?limit=7"). URLSearchParams builds it
  // and encodes it for us.
  const query = new URLSearchParams({ limit: String(limit) })

  const response = await fetch(`${API_BASE_URL}${path}?${query}`, { signal })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }

  // Read the body once, log it for debugging, then hand the same value back.
  const payload: HydrocarbonPrediction = await response.json()
  console.log(
    `[predict-hydrocarbon] station=${stationNumber} limit=${limit}`,
    payload
  )

  return payload
}

// The runoff coefficient the forecast is run with.
export const BASELINE_RUNOFF_COEFFICIENT = 0.6

// Fetch the upstream watershed and runoff impact data for a station. A
// scenario coefficient runs a what-if against the forecast's fixed cut-offs.
export async function fetchWatershed(
  stationNumber: string,
  options: {
    runoffCoefficient?: number
    scenarioCoefficient?: number
    hour?: string
    signal?: AbortSignal
  } = {}
): Promise<WatershedResponse> {
  const path = `/api/v1/get-hydrometric-stations/${encodeURIComponent(stationNumber)}/watershed`
  const params = new URLSearchParams()
  if (options.scenarioCoefficient != null) {
    params.set("runoff_coefficient", String(options.scenarioCoefficient))
    params.set("reference_coefficient", String(BASELINE_RUNOFF_COEFFICIENT))
  } else if (options.runoffCoefficient != null) {
    params.set("runoff_coefficient", String(options.runoffCoefficient))
  }
  if (options.hour != null) {
    params.set("hour", options.hour)
  }

  const query = params.toString()
  const response = await fetch(
    `${API_BASE_URL}${path}${query ? `?${query}` : ""}`,
    { signal: options.signal }
  )

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }

  const payload: WatershedResponse = await response.json()
  console.log(`[watershed] station=${stationNumber}`, payload)
  return payload
}
