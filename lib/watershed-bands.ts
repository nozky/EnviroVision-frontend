import type { WatershedClass } from "@/lib/dashboard-data"

// Three bands the runoff impact is shown in. Colors match the app's --good and
// --warn tokens, with amber in between.
export type WatershedBand = "normal" | "medium" | "critical"

export const WATERSHED_BANDS: Record<
  WatershedBand,
  { label: string; color: string; range: string }
> = {
  normal: { label: "Normal", color: "#029c4b", range: "Below median runoff" },
  medium: {
    label: "Medium",
    color: "#f59e0b",
    range: "Median to 90th percentile",
  },
  critical: {
    label: "Critical",
    color: "#fd2e2e",
    range: "Top 10% of runoff",
  },
}

// The backend splits runoff into five classes (0-4) by percentile. Class 0 is
// no runoff and class 1 is below the median, so both count as normal.
const CLASS_BAND: Record<number, WatershedBand> = {
  0: "normal",
  1: "normal",
  2: "medium",
  3: "medium",
  4: "critical",
}

// Colors the backend paints each class with (see _render_image in hydro.py).
const BACKEND_PALETTE: Array<{ value: number; rgb: [number, number, number] }> = [
  { value: 1, rgb: [0xff, 0xff, 0xb2] },
  { value: 2, rgb: [0xfe, 0xcc, 0x5c] },
  { value: 3, rgb: [0xfd, 0x8d, 0x3c] },
  { value: 4, rgb: [0xb1, 0x00, 0x26] },
]

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function nearestClass(r: number, g: number, b: number) {
  let best = BACKEND_PALETTE[0]
  let bestDistance = Infinity
  for (const entry of BACKEND_PALETTE) {
    const [pr, pg, pb] = entry.rgb
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = entry
    }
  }
  return best.value
}

// Sum each band's share of the watershed, in percent.
export function bandPercents(
  classes: WatershedClass[]
): Record<WatershedBand, number> {
  const totals: Record<WatershedBand, number> = {
    normal: 0,
    medium: 0,
    critical: 0,
  }
  for (const item of classes) {
    const band = CLASS_BAND[item.value]
    if (band) totals[band] += item.percent
  }
  return totals
}

// Repaint the backend's impact PNG in the three band colors. Normal areas are
// left transparent so the watershed's green fill shows through.
export async function recolorImpactImage(dataUri: string): Promise<string> {
  const image = new Image()
  image.src = dataUri
  await image.decode()

  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext("2d")
  if (!context) return dataUri

  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const band = CLASS_BAND[nearestClass(data[i], data[i + 1], data[i + 2])]
    if (band === "normal") {
      data[i + 3] = 0
      continue
    }

    const [r, g, b] = hexToRgb(WATERSHED_BANDS[band].color)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }

  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL("image/png")
}
