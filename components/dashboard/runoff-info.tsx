"use client"

import { Info } from "lucide-react"
import { Popover } from "@base-ui/react/popover"

import { BASELINE_RUNOFF_COEFFICIENT } from "@/lib/api"

const BASELINE_PERCENT = Math.round(BASELINE_RUNOFF_COEFFICIENT * 100)

// The small "i" beside the runoff what-if. It explains what the runoff share
// is, where the default comes from, and what it does not come from.
export function RunoffInfoButton() {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="About the runoff coefficient"
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-slate transition-colors outline-none hover:bg-table-head hover:text-navy focus-visible:ring-2 focus-visible:ring-brand-blue/50"
      >
        <Info className="size-3.5" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="start"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup className="w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-card-edge bg-card p-3 text-xs shadow-md outline-none">
            <h3 className="text-xs font-semibold text-navy">
              Where the {BASELINE_PERCENT}% runoff comes from
            </h3>

            <p className="mt-2 leading-relaxed text-slate">
              The runoff coefficient is the share of rainfall that flows off the
              land instead of soaking in. The model uses {BASELINE_PERCENT}% as
              its default starting value.
            </p>

            <p className="mt-2 leading-relaxed text-slate">
              This is a model assumption. It was set when the watershed model
              was built and has not been measured or calibrated for this
              watershed, and it is not derived from a published table.
            </p>

            <p className="mt-2 leading-relaxed text-slate">
              Real runoff depends on land cover and soil. The USDA Natural
              Resources Conservation Service method (TR-55) estimates runoff
              from those using curve numbers. For woodland in good condition,
              those curve numbers range from about 30 on the most permeable
              soils to about 79 on the least permeable, so one fixed share may
              not fit this watershed.
            </p>

            <p className="mt-2 leading-relaxed text-slate">
              The what-if presets show 75%, 90% and 100%. 100% is the maximum,
              because rain cannot produce more runoff than it delivers.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
