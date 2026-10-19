import type { ApiStation } from "@/lib/dashboard-data"

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
