"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { HydrocarbonPrediction } from "@/lib/dashboard-data"

// Chart colors live in CSS variables, so read them from the document instead of
// hardcoding hex values. This keeps the chart in step with the light/dark
// tokens. The fallbacks match the light theme for the server render.
const CHART_VARS = {
  slate: { name: "--slate", fallback: "#5f7194" },
  blue: { name: "--brand-blue", fallback: "#0287f4" },
  forecast: { name: "--forecast", fallback: "#a55701" },
  grid: { name: "--card-edge", fallback: "#ebf2f9" },
  surface: { name: "--card", fallback: "#ffffff" },
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

// One row the chart draws: the date and the value for that date. A row carries
// either a measured value (blue history) or a forecast value (orange segment).
type ChartPoint = {
  date: string
  actual: number | null
  forecast: number | null
  // True on the rows the orange forecast line draws, so the marker can tell
  // the shared anchor point (a measured reading) from the prediction itself.
  isForecast: boolean
}

export type ForecastSeries = {
  // Every date the chart needs to draw, oldest first: the measured samples plus
  // the forecast date when a forecast could be worked out.
  rows: ChartPoint[]
  // The date of the newest measurement, where history ends and the forecast
  // begins. Null when there is no measurement to anchor the forecast to.
  latestDate: string | null
  // The forecast target date, seven days after the latest measurement.
  forecastDate: string | null
  // The predicted value for the forecast date.
  forecastValue: number | null
}

// Readings are weekly, so a one-week-ahead forecast means seven days out. This
// is the gap the sampling schedule has to show before we trust that interval.
const SAMPLE_INTERVAL_DAYS = 7
// How far either side of a week a gap can drift and still count as weekly.
const SAMPLE_INTERVAL_TOLERANCE_DAYS = 1
// How many recent gaps to look at when judging the schedule.
const RECENT_GAPS = 3

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseDate(date: string): number {
  return new Date(`${date}Z`).getTime()
}

function addDays(date: string, days: number): string {
  return new Date(parseDate(date) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)
}

// The middle gap between recent samples, or null when there are too few dates.
function medianGapDays(dates: string[]): number | null {
  if (dates.length < 2) return null

  const gaps: number[] = []
  for (let i = Math.max(1, dates.length - RECENT_GAPS); i < dates.length; i++) {
    gaps.push((parseDate(dates[i]) - parseDate(dates[i - 1])) / MS_PER_DAY)
  }
  gaps.sort((a, b) => a - b)

  const middle = Math.floor(gaps.length / 2)
  return gaps.length % 2 === 0
    ? (gaps[middle - 1] + gaps[middle]) / 2
    : gaps[middle]
}

// Turn the API rows into the two series the chart draws.
//
// The measured readings become the blue history exactly as they came back, only
// sorted oldest first. The forecast is a *separate* two-point line that starts
// at the newest measurement and ends at the predicted value on the date one
// sampling interval later. Predicted values are never mixed into the history.
export function buildForecastSeries(
  prediction: HydrocarbonPrediction | null | undefined
): ForecastSeries {
  const empty: ForecastSeries = {
    rows: [],
    latestDate: null,
    forecastDate: null,
    forecastValue: null,
  }
  if (!prediction) return empty

  // Only rows with a real measurement belong in the history.
  const measured = prediction.data
    .filter((point) => point.actual != null)
    .slice()
    .sort((a, b) => parseDate(a.sample_datetime) - parseDate(b.sample_datetime))
  if (measured.length === 0) return empty

  const latest = measured[measured.length - 1]
  const rows: ChartPoint[] = measured.map((point) => ({
    date: point.sample_datetime,
    actual: point.actual,
    forecast: null,
    isForecast: false,
  }))

  // The newest predicted value is the one the model made for the week after the
  // last measurement, so that is what the orange segment points at.
  const forecastValue = prediction.data.reduce<number | null>(
    (found, point) => point.predicted ?? found,
    null
  )

  const gap = medianGapDays(measured.map((point) => point.sample_datetime))
  const weekly =
    gap != null &&
    Math.abs(gap - SAMPLE_INTERVAL_DAYS) <= SAMPLE_INTERVAL_TOLERANCE_DAYS

  // Without a weekly schedule there is no supported interval to predict over,
  // so the chart stays with the measured history alone.
  if (forecastValue == null || !weekly) {
    return {
      rows,
      latestDate: latest.sample_datetime,
      forecastDate: null,
      forecastValue: null,
    }
  }

  const forecastDate = addDays(latest.sample_datetime, SAMPLE_INTERVAL_DAYS)

  // Reuse the newest measurement's row as the forecast line's first point, so
  // the orange segment leaves from where the blue line stops without adding a
  // second row on that date (which would repeat the tick) and without joining
  // any earlier history.
  rows[rows.length - 1].forecast = latest.actual
  // One row per date, ending at the predicted value on the forecast date.
  rows.push({
    date: forecastDate,
    actual: null,
    forecast: forecastValue,
    isForecast: true,
  })

  return {
    rows,
    latestDate: latest.sample_datetime,
    forecastDate,
    forecastValue,
  }
}

// A marker that only draws on the forecast point. Recharts clones this element
// once per data point and adds the computed pixel coordinates plus the row
// itself, so the shared anchor point (a measured reading) keeps just the blue
// marker from the history line and only the predicted point gets an orange one.
function ForecastDot(props: {
  cx?: number
  cy?: number
  payload?: ChartPoint
  [key: string]: unknown
}) {
  const { cx, cy, payload } = props
  if (!payload?.isForecast || cx == null || cy == null) return <g />
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--color-forecast)"
      stroke="var(--color-card)"
      strokeWidth={1.5}
    />
  )
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}Z`))

const formatFullDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}Z`))

type PahForecastChartProps = {
  // The prediction data for the selected station, or null before one loads.
  prediction: HydrocarbonPrediction | null
  // True while the backend is being asked for data.
  loading: boolean
  error: string | null
  // The station these numbers belong to, shown in the sub-heading.
  stationNumber: string | null
  // The Forecast/Evaluation segmented control, kept in the header so it stays
  // in the same spot whichever chart the card shows.
  viewToggle: ReactNode
}

export function PahForecastChart({
  prediction,
  loading,
  error,
  stationNumber,
  viewToggle,
}: PahForecastChartProps) {
  const colors = useChartColors()
  const { rows, latestDate, forecastDate, forecastValue } =
    buildForecastSeries(prediction)

  const hasData = rows.length > 0
  const hasForecast = forecastDate != null && forecastValue != null

  // The one line above the disclaimer: an error wins, otherwise the forecast
  // read-out, otherwise why there is no forecast.
  const readout = error ? (
    <span className="text-warn">{error}</span>
  ) : hasForecast ? (
    <span>
      Forecast target {formatFullDate(forecastDate)} ·{" "}
      <span className="tabular-nums">{forecastValue.toFixed(4)} µg/L</span>{" "}
      predicted by XGBoost.
    </span>
  ) : hasData ? (
    <span>
      No 7-day forecast for this station: the sample schedule is not weekly.
    </span>
  ) : null

  return (
    <section className="absolute inset-0 flex w-full flex-col rounded-xl border border-card-edge bg-card p-2.5 shadow-sm">
      <header className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div>
          <h2 className="text-sm font-semibold text-navy">
            PAH Concentration Forecast
          </h2>
          <p className="text-xs text-slate">
            Historical weekly measurements and 7-day-ahead forecast
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate">
            {stationNumber ? `Station ${stationNumber}` : "No station selected"}
          </p>
          {viewToggle}
        </div>
      </header>

      {/* Takes whatever height the header and footer leave, so the date axis and
          footer stay inside the drawer at any width. */}
      <div className="relative min-h-24 w-full flex-1">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 20, bottom: 4 }}>
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
                width={52}
                tick={{ fill: colors.slate, fontSize: 11 }}
              >
                <Label
                  value="PAH concentration (µg/L)"
                  angle={-90}
                  position="insideLeft"
                  style={{
                    fill: colors.slate,
                    fontSize: 11,
                    textAnchor: "middle",
                  }}
                />
              </YAxis>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const row = payload[0].payload as ChartPoint
                  const value = row.actual ?? row.forecast
                  const isForecast = row.actual == null
                  return (
                    <div className="rounded-lg border border-card-edge bg-card px-2.5 py-2 text-xs shadow-sm">
                      <p className="font-medium text-navy">
                        {formatFullDate(row.date)}
                      </p>
                      <p className="text-navy tabular-nums">
                        {value == null ? "—" : `${value.toFixed(4)} µg/L`}
                      </p>
                      <p className="text-slate">
                        {isForecast ? "Forecast" : "Actual"}
                      </p>
                    </div>
                  )
                }}
              />
              {/* Where the measured readings stop and the forecast begins. */}
              {latestDate && (
                <ReferenceLine
                  x={latestDate}
                  stroke={colors.slate}
                  strokeDasharray="4 4"
                >
                  <Label
                    value="Forecast begins"
                    angle={-90}
                    position="insideBottomRight"
                    offset={8}
                    style={{ fill: colors.slate, fontSize: 10 }}
                  />
                </ReferenceLine>
              )}
              <Legend
                verticalAlign="top"
                align="right"
                height={24}
                iconType="plainline"
                wrapperStyle={{ fontSize: 11, color: colors.slate }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={colors.blue}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.blue }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                name="Historical PAH"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={colors.forecast}
                strokeWidth={2}
                dot={<ForecastDot />}
                activeDot={{ r: 5 }}
                connectNulls={false}
                name="7-Day Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          /* Nothing to draw until the backend sends rows for this station. */
          <div className="flex h-full items-center justify-center rounded-lg bg-table-head text-xs text-slate">
            No forecast data yet.
          </div>
        )}

        {/* A soft cover with a spinner while the numbers are on their way. */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-card/80 text-xs text-slate">
            <Loader2 className="size-4 animate-spin text-brand-blue" />
            Loading forecast…
          </div>
        )}
      </div>

      {/* One compact line for the read-out and the data note, so the card
          stays short and the map above keeps the screen. */}
      <footer className="mt-0.5 shrink-0 text-[11px] leading-snug text-slate">
        {readout}
        {readout && " · "}
        {/* These readings come from the seeded simulation table, so say so. */}
        <span className="text-slate/80">
          Synthetic demonstration data, not observed samples.
        </span>
      </footer>
    </section>
  )
}
