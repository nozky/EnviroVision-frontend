"use client"

// Labelled compass rose. It turns opposite to the map's bearing so "N" always
// points to true north, even after the map has been rotated.
export function MapCompass({ bearing }: { bearing: number }) {
  return (
    <div
      className="pointer-events-none absolute top-3 left-1/2 z-10 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border border-card-edge bg-card/95 text-[10px] font-semibold text-slate shadow-md"
      aria-label="Compass"
      role="img"
    >
      <div
        className="relative size-full transition-transform duration-150"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 font-bold text-warn">
          N
        </span>
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2">S</span>
        <span className="absolute top-1/2 left-1 -translate-y-1/2">W</span>
        <span className="absolute top-1/2 right-1 -translate-y-1/2">E</span>
      </div>
    </div>
  )
}
