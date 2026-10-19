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
    <section className="rounded-xl border border-card-edge bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-5">
        {/* Title and legend sit beside the chart on wide screens so the card
            stays short and the map above keeps the screen. */}
        <div className="flex shrink-0 flex-col justify-center gap-2 lg:w-56">
          <header>
            <h2 className="text-sm font-semibold text-navy">
              PAH Concentration Over Time
            </h2>
            <p className="text-xs text-slate">
              {stationNumber
                ? `Station ${stationNumber}`
                : "Athabasca River near Jasper (07AA002)"}
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate lg:flex-col lg:items-start lg:gap-1">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-brand-blue" />
              Measured (weekly)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-forecast" />
              Predicted (XGBoost)
            </span>
          </div>

          {error && <p className="text-xs text-warn">{error}</p>}
        </div>

        <div className="relative h-32 min-w-0 flex-1 lg:h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fill: colors.slate, fontSize: 11 }}
              />
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(value: number) => value.toFixed(3)}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: colors.slate, fontSize: 11 }}
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
                dot={{ r: 3, fill: colors.blue }}
                activeDot={{ r: 5 }}
                connectNulls
                name="actual"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.forecast}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.forecast }}
                activeDot={{ r: 5 }}
                connectNulls
                name="predicted"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* A soft cover with a spinner while the numbers are on their way. */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-card/80 text-xs text-slate">
              <Loader2 className="size-4 animate-spin text-brand-blue" />
              Loading predictions…
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
