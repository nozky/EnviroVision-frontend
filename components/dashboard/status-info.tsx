"use client"

import { ExternalLink, Info } from "lucide-react"
import { Popover } from "@base-ui/react/popover"

import { STATUS_META, STATUS_THRESHOLDS } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

// The two official sources shown at the bottom of the popover. Both open in a
// new tab so the dashboard stays where it is.
const GUIDELINE_PAGE_URL = "https://www.alberta.ca/water-quality-guidelines"
const GUIDELINE_DOC_URL = "https://open.alberta.ca/publications/9781460138731"

// Three decimal places is enough to tell the guideline bands apart — the same
// precision the KPI cards use.
const formatThreshold = (value: number) => value.toFixed(3)

// The bands as they are actually read in lib/dashboard-data.ts: the same
// thresholds, the same labels and the same colours as the map and KPI cards.
const BANDS = [
  {
    status: "normal" as const,
    range: `≤ ${formatThreshold(STATUS_THRESHOLDS.medium)} µg/L`,
    meaning: "Comfortably below the guideline",
  },
  {
    status: "medium" as const,
    range: `${formatThreshold(STATUS_THRESHOLDS.medium)} – ${formatThreshold(STATUS_THRESHOLDS.guideline)} µg/L`,
    meaning: "Approaching the guideline",
  },
  {
    status: "high" as const,
    range: `> ${formatThreshold(STATUS_THRESHOLDS.guideline)} µg/L`,
    meaning: "Guideline exceeded",
  },
]

// The small "i" beside the station's status badge. It opens a popover that
// says where the Normal/Medium/High bands come from, with links to the
// Government of Alberta pages the guideline is published on — so the cut-offs
// can be checked against their source rather than taken on trust.
export function StatusInfoButton() {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="About the status levels"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-slate transition-colors outline-none hover:bg-table-head hover:text-navy focus-visible:ring-2 focus-visible:ring-brand-blue/50"
      >
        <Info className="size-4" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="center"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup className="w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-card-edge bg-card p-3 text-xs shadow-md outline-none">
            <h3 className="text-xs font-semibold text-navy">
              Where Normal / Medium / High come from
            </h3>

            <ul className="mt-2 space-y-1.5">
              {BANDS.map(({ status, range, meaning }) => {
                const meta = STATUS_META[status]
                return (
                  <li key={status} className="flex items-start gap-2">
                    {/* The same fixed colour the map marker uses, so the dot
                        matches the legend exactly. */}
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="min-w-0">
                      <span className={cn("font-semibold", meta.textClass)}>
                        {meta.label}
                      </span>{" "}
                      <span className="text-navy tabular-nums">{range}</span>
                      <span className="block text-slate">{meaning}</span>
                    </span>
                  </li>
                )
              })}
            </ul>

            <p className="mt-2.5 leading-relaxed text-slate">
              The {formatThreshold(STATUS_THRESHOLDS.guideline)} µg/L level is
              the CCME interim Canadian water quality guideline for PAHs for the
              protection of aquatic life, carried in the Government of
              Alberta&apos;s{" "}
              <span className="italic">
                Environmental Quality Guidelines for Alberta Surface Waters
              </span>
              . Alberta&apos;s guidelines are science-based concentrations meant
              to protect aquatic life, agriculture and recreation, and they
              include guidelines from CCME, Environment and Climate Change
              Canada and the US EPA.
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-slate/80">
              The {formatThreshold(STATUS_THRESHOLDS.medium)} µg/L floor of the
              Medium band is a margin chosen for this dashboard to flag values
              creeping up on the guideline — it is not a regulatory value.
            </p>

            <div className="mt-2.5 flex flex-col gap-1.5 border-t border-card-edge pt-2.5">
              <a
                href={GUIDELINE_PAGE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-brand-blue underline underline-offset-2 hover:text-navy"
              >
                Water quality guidelines — alberta.ca
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <a
                href={GUIDELINE_DOC_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-brand-blue underline underline-offset-2 hover:text-navy"
              >
                Environmental Quality Guidelines for Alberta Surface Waters
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
