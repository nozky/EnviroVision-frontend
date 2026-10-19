"use client"

import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { riskStatus, visibleStations, type Station } from "@/lib/dashboard-data"

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

// Jasper National Park and the Athabasca River. MapLibre expects
// [longitude, latitude].
const JASPER_CENTER: [number, number] = [-118.08, 52.89]
const START_ZOOM = 10

const RISK_COLOR: Record<string, string> = {
  Elevated: "#fd3131",
  Moderate: "#fe8908",
  Normal: "#03c25d",
}

type ForecastMapProps = {
  // Called with the station a marker was clicked on.
  onSelectStation: (station: Station) => void
}

export function ForecastMap({ onSelectStation }: ForecastMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

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
      center: JASPER_CENTER,
      zoom: START_ZOOM,
    })
    mapRef.current = map

    // Zoom in/out buttons plus a compass, matching the screenshot.
    map.addControl(new maplibregl.NavigationControl(), "top-right")
    // Distance scale in the bottom-right.
    map.addControl(new maplibregl.ScaleControl(), "bottom-right")

    map.on("load", () => {
      map.addSource("stations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: visibleStations.map((station) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [station.longitude, station.latitude],
            },
            properties: {
              station_number: station.station_number,
              color: RISK_COLOR[riskStatus(station.predicted_pah_ug_l)],
            },
          })),
        },
      })

      map.addLayer({
        id: "stations-circle",
        type: "circle",
        source: "stations",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
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

      // Clicking a marker reports that station back to the dashboard.
      map.on("click", "stations-circle", (event) => {
        const number = event.features?.[0]?.properties?.station_number
        const station = visibleStations.find(
          (item) => item.station_number === number
        )
        if (station) onSelectStation(station)
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
  }, [onSelectStation])

  return <div ref={containerRef} className="h-full w-full" />
}
