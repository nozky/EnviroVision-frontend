"use client"

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
            <CartesianGrid strokeDasharray="3 3" stroke="#e3edf7" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "#6e80a2", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 0.3]}
              ticks={[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]}
              tickFormatter={(value: number) => value.toFixed(2)}
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fill: "#6e80a2", fontSize: 12 }}
              label={{
                value: "PAH (µg/L)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#6e80a2", fontSize: 12 },
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
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#1193fd"
              strokeWidth={2}
              dot={{ r: 4, fill: "#1193fd" }}
              activeDot={{ r: 6 }}
              connectNulls
              name="historical"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#fe8908"
              strokeWidth={2}
              dot={{ r: 5, fill: "#fe8908" }}
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
