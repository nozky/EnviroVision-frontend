"use client"

import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import { Loader2 } from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"

import {
  getStationStatus,
  latestPoint,
  STATUS_META,
  type HydrocarbonPrediction,
  type Station,
  type StationStatus,
} from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

// Free topographic basemap from OpenTopoMap. No API key needed.
const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    topo: {
      type: "raster",
      tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenTopoMap (CC-BY-SA)",
    },
  },
  layers: [{ id: "topo", type: "raster", source: "topo" }],
}

// Jasper National Park and the Athabasca River, used until the markers load.
// MapLibre expects [longitude, latitude].
const DEFAULT_CENTER: [number, number] = [-118.08, 52.89]
const DEFAULT_ZOOM = 8

// How far above/below the marker the card sits, leaving room for its tail.
const CARD_OFFSET = 14
// Markers above this y-pixel would push the card off the top, so it drops below.
const FLIP_THRESHOLD = 150

// Build the map points from the stations. Each point carries a `status` so the
// marker can be coloured, and a `selected` flag so the chosen one stands out.
function buildPoints(
  stations: Station[],
  statuses: Record<string, StationStatus>,
  selectedNumber: string | null
) {
  return stations.map((station) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [station.longitude, station.latitude] as [number, number],
    },
    properties: {
      station_number: station.station_number,
      status: statuses[station.station_number] ?? "unknown",
      selected: station.station_number === selectedNumber,
    },
  }))
}

function buildCollection(
  stations: Station[],
  statuses: Record<string, StationStatus>,
  selectedNumber: string | null
) {
  return {
    type: "FeatureCollection" as const,
    features: buildPoints(stations, statuses, selectedNumber),
  }
}

type ForecastMapProps = {
  stations: Station[]
  forecastDate: string
  // Tells the dashboard which station the user clicked.
  onSelectStation?: (station: Station) => void
  // The station the dashboard currently has selected, and its data.
  selectedStation: Station | null
  // Every station's status, used to colour the markers.
  statuses: Record<string, StationStatus>
  selectedPrediction: HydrocarbonPrediction | null | undefined
  selectedLoading: boolean
  selectedError: string | null
}

export function ForecastMap({
  stations,
  forecastDate,
  onSelectStation,
  selectedStation,
  statuses,
  selectedPrediction,
  selectedLoading,
  selectedError,
}: ForecastMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // The map is built once, so the handlers and data are read from refs.
  const stationsRef = useRef(stations)
  const statusesRef = useRef(statuses)
  const selectedStationRef = useRef(selectedStation)
  const onSelectRef = useRef(onSelectStation)

  // The station whose marker was clicked and its on-screen pixel position.
  const [selected, setSelected] = useState<Station | null>(null)
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  // Same station as `selected`, readable from inside the map's move handler.
  const selectedRef = useRef<Station | null>(null)

  // Keep the refs in step with the props outside of render.
  useEffect(() => {
    stationsRef.current = stations
  }, [stations])
  useEffect(() => {
    statusesRef.current = statuses
  }, [statuses])
  useEffect(() => {
    selectedStationRef.current = selectedStation
  }, [selectedStation])
  useEffect(() => {
    onSelectRef.current = onSelectStation
  }, [onSelectStation])

  const closeCard = () => {
    selectedRef.current = null
    setSelected(null)
    setAnchor(null)
  }

  useEffect(() => {
    if (!containerRef.current) return

    // MapLibre runs a background worker. After bundling, it can't locate that
    // file itself, so we point it at the copy Next.js serves.
    maplibregl.setWorkerUrl(
      new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href
    )

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    mapRef.current = map

    // Zoom in/out buttons plus a compass, matching the screenshot.
    map.addControl(new maplibregl.NavigationControl(), "top-right")
    // Distance scale in the bottom-right.
    map.addControl(new maplibregl.ScaleControl(), "bottom-right")

    // Keep the card glued to its marker while the map pans or zooms.
    const repositionCard = () => {
      const station = selectedRef.current
      if (!station) return
      const point = map.project([station.longitude, station.latitude])
      setAnchor({ x: point.x, y: point.y })
    }
    map.on("move", repositionCard)

    map.on("load", () => {
      const current = stationsRef.current

      map.addSource("stations", {
        type: "geojson",
        data: buildCollection(
          current,
          statusesRef.current,
          selectedStationRef.current?.station_number ?? null
        ),
      })

      // Marker colour comes from each point's status, and the selected marker
      // is drawn a little larger. These are canvas paints (not CSS tokens), so
      // the colours are fixed hex values.
      map.addLayer({
        id: "stations-circle",
        type: "circle",
        source: "stations",
        paint: {
          "circle-color": [
            "match",
            ["get", "status"],
            "elevated",
            STATUS_META.elevated.color,
            "normal",
            STATUS_META.normal.color,
            STATUS_META.unknown.color,
          ],
          "circle-radius": ["case", ["get", "selected"], 13, 9],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["case", ["get", "selected"], 3, 2],
        },
      })

      // Station numbers sit next to each marker.
      map.addLayer({
        id: "stations-label",
        type: "symbol",
        source: "stations",
        layout: {
          "text-field": ["get", "station_number"],
          "text-size": 12,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#0b1633",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      })

      // Zoom to fit every marker; the network spans well beyond Jasper townsite.
      if (current.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        for (const station of current) {
          bounds.extend([station.longitude, station.latitude])
        }
        map.fitBounds(bounds, { padding: 60, maxZoom: 11 })
      }

      // Clicking a marker opens the card on that marker.
      map.on("click", "stations-circle", (event) => {
        const number = event.features?.[0]?.properties?.station_number
        const station = stationsRef.current.find(
          (item) => item.station_number === number
        )
        if (!station) return

        selectedRef.current = station
        setSelected(station)
        const point = map.project([station.longitude, station.latitude])
        setAnchor({ x: point.x, y: point.y })

        // Let the dashboard know which station is now shown.
        onSelectRef.current?.(station)
      })

      map.on("mouseenter", "stations-circle", () => {
        map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", "stations-circle", () => {
        map.getCanvas().style.cursor = ""
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Recolour the markers whenever the statuses or the selected station change.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.setData(
      buildCollection(
        stations,
        statuses,
        selectedStation?.station_number ?? null
      )
    )
  }, [stations, statuses, selectedStation])

  // Drop the card below the marker when it would otherwise run off the top.
  const flipped = anchor ? anchor.y < FLIP_THRESHOLD : false

  // Only show the dashboard's data if it belongs to the station in this card.
  const isCurrent = selected?.station_number === selectedStation?.station_number
  const latest = isCurrent ? latestPoint(selectedPrediction) : null
  const status = isCurrent ? getStationStatus(selectedPrediction) : "unknown"
  const meta = STATUS_META[status]

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* What the marker colours mean. */}
      <div className="absolute bottom-4 left-3 z-10 rounded-lg border border-card-edge bg-card/95 p-2.5 text-xs shadow-md">
        {(Object.keys(STATUS_META) as StationStatus[]).map((key) => (
          <div key={key} className="flex items-center gap-2 py-0.5 text-slate">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: STATUS_META[key].color }}
            />
            {STATUS_META[key].label}
          </div>
        ))}
      </div>

      {/* Details for the marker that was clicked, anchored to the dot. */}
      {selected && anchor && (
        <div
          className={cn(
            "absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-card-edge bg-card/95 p-3 text-xs shadow-md",
            !flipped && "-translate-y-full"
          )}
          style={{
            left: anchor.x,
            top: flipped ? anchor.y + CARD_OFFSET : anchor.y - CARD_OFFSET,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-semibold text-navy">{selected.station_name}</p>
            <button
              onClick={closeCard}
              className="text-slate hover:text-navy"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-slate">Station {selected.station_number}</p>

          {/* While waiting, show a spinner; then the station's own numbers. */}
          {isCurrent && selectedLoading ? (
            <p className="mt-2 flex items-center gap-2 text-slate">
              <Loader2 className="size-3.5 animate-spin text-brand-blue" />
              Loading predictions…
            </p>
          ) : isCurrent && selectedError ? (
            <p className="mt-2 text-warn">{selectedError}</p>
          ) : (
            <>
              <p className="mt-1">
                Latest measured:{" "}
                <span className="font-medium">
                  {latest?.actual != null
                    ? `${latest.actual.toFixed(4)} µg/L`
                    : "—"}
                </span>
              </p>
              <p>
                Predicted:{" "}
                <span className="font-medium">
                  {latest?.predicted != null
                    ? `${latest.predicted.toFixed(4)} µg/L`
                    : "—"}
                </span>
              </p>
            </>
          )}

          <p>
            Forecast date: <span className="font-medium">{forecastDate}</span>
          </p>
          <p>
            Status:{" "}
            <span className="font-medium" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </p>

          {/* Tail pointing back at the marker. */}
          <span
            className={cn(
              "absolute left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-card-edge bg-card/95",
              flipped
                ? "-top-1 border-t border-l"
                : "top-full -translate-y-1/2 border-r border-b"
            )}
          />
        </div>
      )}
    </div>
  )
}
