"use client"

import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"

import { cn } from "cn"

// Which of the two charts at the bottom of the dashboard is on show.
export type ChartView = "forecast" | "evaluation"

const VIEWS = [
  { value: "forecast", label: "Forecast" },
  { value: "evaluation", label: "Evaluation" },
] as const

type ChartViewToggleProps = {
  // The chart currently shown, so the pressed button can be styled.
  view: ChartView
  onViewChange: (view: ChartView) => void
}

// Segmented control that sits in the chart card's header and picks which
// chart the card shows. Base UI supplies the group semantics — role="group",
// aria-pressed on each button, roving arrow-key focus — and the dashboard
// tokens supply the colours, so it follows the light/dark theme.
export function ChartViewToggle({ view, onViewChange }: ChartViewToggleProps) {
  return (
    <ToggleGroup
      value={[view]}
      onValueChange={(next) => {
        // An exclusive group reports [] when the pressed button is pressed
        // again; ignore that so a chart is always on screen.
        const selected = next[0]
        if (selected) onViewChange(selected)
      }}
      aria-label="Chart to show"
      className="inline-flex items-center gap-0.5 rounded-lg border border-card-edge bg-table-head p-0.5"
    >
      {VIEWS.map(({ value, label }) => (
        <Toggle
          key={value}
          value={value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand-blue/50",
            view === value
              ? "bg-card text-navy shadow-sm"
              : "text-slate hover:text-navy"
          )}
        >
          {label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
