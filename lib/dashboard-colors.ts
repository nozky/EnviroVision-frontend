// Fixed colors for the map and its legend.
//
// The map uses an OpenTopoMap raster basemap that is always light, so these
// values must not follow the UI theme (unlike the CSS tokens, which flip in
// dark mode). They are the light-mode status colors, tuned to stay visible on
// the pale basemap and to meet WCAG AA for graphical objects.

import type { RiskStatus } from "@/lib/dashboard-data"

export const riskColors: Record<RiskStatus, string> = {
  Elevated: "#fd2e2e",
  Moderate: "#a55701",
  Normal: "#029c4b",
}
