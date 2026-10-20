import { Loader2, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

import { StatusInfoButton } from "@/components/dashboard/status-info"
import {
  latestPoint,
  STATUS_META,
  type HydrocarbonPrediction,
  type Station,
  type StationStatus,
} from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

function formatDate(date: string) {
  // "2026-10-17" -> "Oct 17, 2026". Formatting in UTC keeps the day from
  // slipping back one in Alberta's time zone.
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date))
}

// A readout is blank when its value is missing.
function formatValue(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(4)
}

function formatArea(value: number | null | undefined) {
  return value == null ? "—" : `${value.toLocaleString("en-CA")} km²`
}

// One line in the "About this station" list.
function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs font-medium text-slate">{label}</dt>
      <dd className="truncate text-right text-xs text-navy">{children}</dd>
    </div>
  )
}

type StationDetailProps = {
  // The station the user picked, or null before anything is chosen.
  station: Station | null
  prediction: HydrocarbonPrediction | null | undefined
  // The status the dashboard ranked this station at.
  status: StationStatus
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function StationDetail({
  station,
  prediction,
  status,
  loading,
  error,
  onRetry,
}: StationDetailProps) {
  // Nothing chosen yet.
  if (!station) {
    return (
      <section className="flex min-h-40 items-center justify-center rounded-xl border border-card-edge bg-card p-6 text-center text-sm text-slate shadow-sm">
        Select a station on the map to see its details.
      </section>
    )
  }

  const latest = latestPoint(prediction)
  const meta = STATUS_META[status]
  const change =
    latest?.actual != null && latest.predicted != null
      ? latest.predicted - latest.actual
      : null

  return (
    <section className="rounded-xl border border-card-edge bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-card-edge px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">
            {station.station_name}
          </h2>
          <p className="mt-0.5 text-xs text-slate">
            Station {station.station_number}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* The same colour the marker uses on the map. */}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              meta.softClass,
              meta.textClass
            )}
          >
            {meta.label}
          </span>
          {/* Where these levels come from, with the official source. */}
          <StatusInfoButton />
        </div>
      </header>

      <div className="p-3">
        {/* Prediction readout, or its loading/error state. */}
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            {error}
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-md bg-card px-2 py-1 text-xs font-medium text-navy shadow-sm"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-table-head px-3 py-4 text-xs text-slate">
            <Loader2 className="size-4 animate-spin text-brand-blue" />
            Loading predictions…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-table-head px-2.5 py-2">
              <p className="text-[11px] font-medium text-slate">Latest sample</p>
              <p className="text-xs font-semibold text-navy">
                {latest ? formatDate(latest.sample_datetime) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-table-head px-2.5 py-2">
              <p className="text-[11px] font-medium text-slate">
                Records shown
              </p>
              <p className="text-xs font-semibold tabular-nums text-navy">
                {prediction ? prediction.data.length : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-table-head px-2.5 py-2">
              <p className="text-[11px] font-medium text-slate">
                Measured (µg/L)
              </p>
              <p className="text-xs font-semibold tabular-nums text-navy">
                {formatValue(latest?.actual)}
              </p>
            </div>
            <div className="rounded-lg bg-table-head px-2.5 py-2">
              <p className="text-[11px] font-medium text-slate">
                Predicted (µg/L)
              </p>
              <p className="text-xs font-semibold tabular-nums text-navy">
                {formatValue(latest?.predicted)}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-table-head px-2.5 py-2">
              <p className="text-[11px] font-medium text-slate">
                Change (predicted − measured)
              </p>
              <p
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  change == null
                    ? "text-navy"
                    : change > 0
                      ? "text-warn"
                      : "text-good"
                )}
              >
                {change == null
                  ? "—"
                  : `${change >= 0 ? "+" : ""}${change.toFixed(4)}`}
              </p>
            </div>
          </div>
        )}

        {/* The station's full record from the backend. */}
        <h3 className="mt-3 text-[11px] font-semibold tracking-wide text-slate uppercase">
          About this station
        </h3>
        <dl className="mt-0.5 divide-y divide-card-edge">
          <DetailRow label="Watercourse">{station.watercourse}</DetailRow>
          <DetailRow label="Area role">{station.area_role}</DetailRow>
          <DetailRow label="Station type">{station.station_type}</DetailRow>
          <DetailRow label="Coordinates">
            <span className="tabular-nums">
              {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
            </span>
          </DetailRow>
          <DetailRow label="Gross drainage area">
            {formatArea(station.gross_drainage_area_km2)}
          </DetailRow>
          <DetailRow label="Effective drainage area">
            {formatArea(station.effective_drainage_area_km2)}
          </DetailRow>
          <DetailRow label="Metadata source">
            <a
              href={station.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-blue underline underline-offset-2"
            >
              {station.metadata_source}
            </a>
          </DetailRow>
          {station.notes && (
            <DetailRow label="Notes">
              <span className="text-slate">{station.notes}</span>
            </DetailRow>
          )}
        </dl>
      </div>
    </section>
  )
}
