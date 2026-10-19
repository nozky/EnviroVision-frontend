"use client"

import { useSyncExternalStore } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { pahForecast, pahHistory } from "@/lib/dashboard-data"

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

// The history and the single forecast point in one list, so a single line
// continues from the last reading into the prediction.
const data = [
  ...pahHistory.map((point) => ({
    date: point.date,
    historical: point.pah,
    forecast: null as number | null,
  })),
  {
    // A repeated point bridges the two series so the line has no gap.
    date: pahHistory[pahHistory.length - 1].date,
    historical: pahHistory[pahHistory.length - 1].pah,
    forecast: pahHistory[pahHistory.length - 1].pah,
  },
  { date: pahForecast.date, historical: null, forecast: pahForecast.pah },
]

const historyDate = pahHistory[pahHistory.length - 1].date

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date))

export function PahChart() {
  const colors = useChartColors()

  return (
    <section className="rounded-xl border border-card-edge bg-card p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-navy">
          PAH Concentration Over Time (Weekly)
        </h2>
        <p className="text-sm text-slate">
          Athabasca River at Jasper (07AA002)
        </p>
      </header>

      {/* Period labels sit above the plot, either side of the dividing line. */}
      <div className="flex justify-between px-12 text-xs text-slate">
        <span>Historical Readings (weekly)</span>
        <span className="text-forecast">7-Day Forecast</span>
      </div>

      <div className="h-[260px] w-full">
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
              domain={[0, 0.3]}
              ticks={[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]}
              tickFormatter={(value: number) => value.toFixed(2)}
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
                Number(value).toFixed(3),
                name === "historical" ? "Historical" : "Forecast",
              ]}
              labelFormatter={(label) => formatDate(String(label))}
            />
            <ReferenceLine
              x={historyDate}
              stroke={colors.slate}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="historical"
              stroke={colors.blue}
              strokeWidth={2}
              dot={{ r: 4, fill: colors.blue }}
              activeDot={{ r: 6 }}
              connectNulls
              name="historical"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={colors.forecast}
              strokeWidth={2}
              dot={{ r: 5, fill: colors.forecast }}
              connectNulls
              name="forecast"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-slate">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-blue" />
          Historical (weekly reading)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-forecast" />
          Forecast (XGBoost, 7 days ahead)
        </span>
      </div>
    </section>
  )
}
