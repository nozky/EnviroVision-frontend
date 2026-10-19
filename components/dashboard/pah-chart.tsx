"use client"

import { useSyncExternalStore } from "react"
import { Loader2 } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  pahForecast,
  pahHistory,
  type HydrocarbonPrediction,
} from "@/lib/dashboard-data"

// Chart colors live in CSS variables, so read them from the document instead of
// hardcoding hex values. This keeps the chart in step with the light/dark
// tokens. The fallbacks match the light theme for the server render.
const CHART_VARS = {
  slate: { name: "--slate", fallback: "#5f7194" },
  blue: { name: "--brand-blue", fallback: "#0287f4" },
  forecast: { name: "--forecast", fallback: "#a55701" },
  grid: { name: "--card-edge", fallback: "#ebf2f9" },
} as const

type ChartColors = Record<keyof typeof CHART_VARS, string>

const FALLBACK_COLORS = Object.fromEntries(
  Object.entries(CHART_VARS).map(([key, { fallback }]) => [key, fallback])
) as ChartColors

// The snapshot is cached so repeated reads return a stable reference, and it is
// invalidated whenever the theme class on <html> changes.
let cachedColors: ChartColors | null = null

function getChartColors(): ChartColors {
  if (cachedColors) return cachedColors

  const styles = getComputedStyle(document.documentElement)
  cachedColors = Object.fromEntries(
    Object.entries(CHART_VARS).map(([key, { name, fallback }]) => [
      key,
      styles.getPropertyValue(name).trim() || fallback,
    ])
  ) as ChartColors
  return cachedColors
}

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(() => {
    cachedColors = null
    callback()
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

function useChartColors(): ChartColors {
  return useSyncExternalStore(
    subscribeToTheme,
    getChartColors,
    () => FALLBACK_COLORS
  )
}

// One row the chart draws: the measured value and the predicted value for a day.
type ChartPoint = {
  date: string
  actual: number | null
  predicted: number | null
}

// Shown only until the first station loads. The same shape as the API data.
const fallbackData: ChartPoint[] = [
  ...pahHistory.map((point) => ({
    date: point.date,
    actual: point.pah,
    predicted: null,
  })),
  { date: pahForecast.date, actual: null, predicted: pahForecast.pah },
]

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date))

type PahChartProps = {
  // The prediction data for the selected station, or null before one loads.
  prediction: HydrocarbonPrediction | null
  // True while the backend is being asked for data.
  loading: boolean
  error: string | null
  // The station these numbers belong to, shown in the sub-heading.
  stationNumber: string | null
}

export function PahChart({
  prediction,
  loading,
  error,
  stationNumber,
}: PahChartProps) {
  const colors = useChartColors()

  // Turn the API rows into chart rows. Until data arrives, use the fallback.
  const data: ChartPoint[] =
    prediction && prediction.data.length > 0
      ? prediction.data.map((point) => ({
          date: point.sample_datetime,
          actual: point.actual,
          predicted: point.predicted,
        }))
      : fallbackData

  return (
    <section className="rounded-xl border border-card-edge bg-card p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-navy">
          PAH Concentration Over Time (Weekly)
        </h2>
        <p className="text-sm text-slate">
          {stationNumber
            ? `Station ${stationNumber}`
            : "Athabasca River near Jasper (07AA002)"}
        </p>
      </header>

      {error && (
        <p className="mb-3 text-sm text-warn">{error}</p>
      )}

      <div className="relative h-65 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: colors.slate, fontSize: 12 }}
            />
            <YAxis
              domain={[0, "auto"]}
              tickFormatter={(value: number) => value.toFixed(3)}
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fill: colors.slate, fontSize: 12 }}
              label={{
                value: "PAH (µg/L)",
                angle: -90,
                position: "insideLeft",
                style: { fill: colors.slate, fontSize: 12 },
              }}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value).toFixed(4),
                name === "actual" ? "Measured" : "Predicted",
              ]}
              labelFormatter={(label) => formatDate(String(label))}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={colors.blue}
              strokeWidth={2}
              dot={{ r: 4, fill: colors.blue }}
              activeDot={{ r: 6 }}
              connectNulls
              name="actual"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke={colors.forecast}
              strokeWidth={2}
              dot={{ r: 4, fill: colors.forecast }}
              activeDot={{ r: 6 }}
              connectNulls
              name="predicted"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* A soft cover with a spinner while the numbers are on their way. */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-card/80 text-sm text-slate">
            <Loader2 className="size-5 animate-spin text-brand-blue" />
            Loading predictions…
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-slate">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-blue" />
          Measured (weekly reading)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-forecast" />
          Predicted (XGBoost model)
        </span>
      </div>
    </section>
  )
}
