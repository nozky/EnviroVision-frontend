# PROJECT.md — EnviroVision Frontend (next-app)

This is the working frontend for EnviroVision, built on **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, and **shadcn/ui (Base UI variant)**. This document is the baseline reference for building on this app: what is installed, how it is wired, and the conventions to follow. It covers **this app only** (dependencies, scripts, structure, conventions, and Next.js 16 specifics).

---

## Stack at a glance

| Area | Choice | Version |
| --- | --- | --- |
| Runtime | Node.js | v22.19.0 |
| Package manager | pnpm (lockfile: `pnpm-lock.yaml`) | 11.16.0 |
| Framework | `next` | 16.4.0 |
| UI runtime | `react` / `react-dom` | 19.3.0 |
| Language | `typescript` (strict) | 5.9.3 |
| Styling | `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 |
| Styling extras | `tw-animate-css` | 1.4.0 |
| Theming | `next-themes` | 0.4.6 |
| UI kit | `shadcn` (Base UI variant) | 4.22.1 |
| UI primitives | `@base-ui/react` | 1.9.0 |
| Class utilities | `class-variance-authority`, `cn` | 0.7.1 / 0.5.0 |
| Icons | `lucide-react` | 1.59.0 |
| Maps | `maplibre-gl` | 6.15.0 |
| Charts | `recharts` | 3.10.1 |
| Linting | `eslint` (flat config) + `eslint-config-next` | 9 / 16.4.0 |
| Formatting | `prettier` + `prettier-plugin-tailwindcss` | 3.9.10 / 0.8.1 |

> The UI kit is the **Base UI** flavor of shadcn (`@base-ui/react`), not the Radix flavor. When reading shadcn docs, pick the Base UI version.

`maplibre-gl` powers the station map (`components/dashboard/forecast-map.tsx`) and `recharts` powers the PAH line chart (`components/dashboard/pah-chart.tsx`).

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server (Turbopack) at http://localhost:3000 |
| `pnpm build` | Production build (also runs type checks) |
| `pnpm start` | Serve the production build (run `build` first) |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Run Prettier over all `.ts`/`.tsx` files |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

---

## Project structure

```txt
next-app/
├── app/
│   ├── layout.tsx          # Root layout: fonts, ThemeProvider, globals.css
│   ├── page.tsx            # Renders <Dashboard />
│   ├── globals.css         # Tailwind import + design tokens (light/dark)
│   └── favicon.ico
├── components/
│   ├── dashboard/
│   │   ├── dashboard.tsx       # Dashboard shell + layout
│   │   ├── kpi-cards.tsx       # Total / Elevated / Normal summary cards
│   │   ├── forecast-map.tsx    # MapLibre station map (OpenTopoMap basemap)
│   │   ├── station-detail.tsx  # Selected station readout + metadata
│   │   └── pah-chart.tsx       # Recharts PAH line chart
│   ├── theme-provider.tsx  # next-themes wrapper + "d" dark-mode hotkey
│   └── ui/
│       └── button.tsx      # shadcn Button (Base UI + cva variants)
├── hooks/                  # (empty — custom hooks go here)
├── lib/
│   ├── api.ts              # Backend fetch helper (stations + predictions)
│   ├── dashboard-data.ts   # Shared types + status/guideline rules
│   └── utils.ts            # re-exports `cn` from the `cn` package
├── public/                 # (empty — static assets go here)
├── AGENTS.md               # Next.js-managed agent instructions
├── CLAUDE.md               # -> @AGENTS.md
├── README.md
├── components.json         # shadcn configuration
├── next.config.ts          # Next.js config (currently empty)
├── postcss.config.mjs      # @tailwindcss/postcss plugin
├── eslint.config.mjs       # ESLint flat config
├── .prettierrc / .prettierignore
├── pnpm-workspace.yaml     # workspace + allowBuilds list
├── tsconfig.json
└── PROJECT.md              # this file
```

---

## Dashboard

The app is a single-page environmental monitoring dashboard. `app/page.tsx` renders
`components/dashboard/dashboard.tsx`, which fetches the station list from the backend and
lays out:

- **KPI cards** (`kpi-cards.tsx`) — total station count plus how many stations fall in
  each risk band, counted from the API predictions.
- **Station map** (`forecast-map.tsx`) — MapLibre GL with a free OpenTopoMap raster
  basemap (no API key). Stations are drawn as circle markers coloured by status; clicking
  one opens a detail card anchored to that marker, which follows the map while panning or
  zooming. MapLibre's worker URL is set explicitly for the bundled build.
- **Station detail** (`station-detail.tsx`) — the selected station's latest measured and
  predicted values, the change between them, and the station's metadata record.
- **PAH chart** (`pah-chart.tsx`) — Recharts line chart of the selected station's measured
  vs. predicted series. It draws only API rows; with no data it shows an empty state.

Stations and predictions are fetched in `dashboard.tsx` through `lib/api.ts`
(`GET /api/v1/get-hydrometric-stations/`,
`GET /api/v1/station/{station}/predict-hydrocarbon?limit={N}`, and
`GET /api/v1/get-hydrometric-stations/{station}/watershed`, base URL from
`NEXT_PUBLIC_API_BASE_URL`). Every value shown on the dashboard comes from those
calls — there is no placeholder/hardcoded data. `lib/dashboard-data.ts` keeps the shared
types plus the status/guideline rules used to classify stations.

The watershed endpoint is called whenever the user selects a station. Its boundary and
impact raster are drawn on the station map (`forecast-map.tsx`) as a GeoJSON fill/line
layer plus an image raster layer; the summary stats appear in `station-detail.tsx`.

---

## Color & contrast

The dashboard palette is defined as CSS variables on `:root` and `.dark` in
`app/globals.css` and exposed to Tailwind via the `@theme inline` blocks (`--color-*`).
Both the standard shadcn tokens and the EnviroVision palette (`--page`, `--navy`,
`--slate`, `--brand-blue`, `--rise`, `--drop`, `--warn`, `--good`, `--forecast`, and the
`*-soft` variants) are **theme-aware** — `.dark` overrides every EnviroVision token, so
never hardcode a light value for a surface that flips with the theme.

Conventions:

- **Targets.** Foreground tokens are tuned to meet WCAG AA: **≥ 4.5:1** for text and
  **≥ 3:1** for icons and graphical fills (markers, chart lines, legend dots). If you add
  a colour pair, check it against both `--page` and `--card` in light and dark.
- **Use tokens, not hex.** Prefer `text-slate`, `bg-drop-soft`, `text-forecast`, etc. For
  canvas/SVG libraries (Recharts, MapLibre) that need concrete values, read the CSS
  variables at runtime — see `pah-chart.tsx`, which caches the computed values and
  re-reads them when the `<html>` class changes (via `useSyncExternalStore`).
- **Dark mode is a light navy, not black.** `.dark` surfaces use `#151d33` (page) and
  `#222e46` (card) with `#3a4866` edges — a deliberately airy blue-gray. The status and
  accent tokens are brightened to match so text still clears AA on the lighter cards.
- **Map stays theme-independent.** The OpenTopoMap basemap is always light, so the map
  uses a fixed marker colour (`MARKER_COLOR` in `forecast-map.tsx`) rather than a theme
  token, which would flip in dark mode and lose contrast on the pale basemap.

---

## Conventions

**Aliases.** `@/*` maps to the project root (`tsconfig.json`). The shadcn aliases in `components.json` are:

- `@/components` → UI components
- `@/components/ui` → shadcn primitives
- `@/lib` and `@/lib/utils` → helpers
- `@/hooks` → custom hooks

**Class names.** Use `cn(...)` from `@/lib/utils` (which re-exports `cn` from the `cn` package) to compose Tailwind classes. Variants use `class-variance-authority` (`cva`), as in `components/ui/button.tsx`.

**Formatting.** Prettier is configured (`.prettierrc`) with: no semicolons, double quotes, 2-space tabs, LF line endings, `es5` trailing commas, 80-char width, and Tailwind class sorting via `prettier-plugin-tailwindcss` (using `cn`/`cva` as class functions and `app/globals.css` as the stylesheet).

**Linting.** ESLint 9 flat config (`eslint.config.mjs`) extends `eslint-config-next` core-web-vitals and TypeScript rules; `.next`, `out`, `build`, and `next-env.d.ts` are ignored.

**Theming.** Design tokens are CSS variables defined for `:root` and `.dark` in `app/globals.css` and exposed to Tailwind through the `@theme inline` block (colors, radii, sidebar, chart tokens). Dark mode uses the `class` strategy. `components/theme-provider.tsx` wires `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) and adds a keyboard shortcut: press **`d`** to toggle dark mode (disabled while typing in inputs).

---

## Next.js 16 notes

This is Next.js 16, which differs from older versions. **Read the bundled docs at `node_modules/next/dist/docs/` before writing code** (also required by `AGENTS.md`). Key points:

- **Turbopack is the default** bundler for `dev` and `build`.
- **`middleware` is renamed to `proxy`** (create `proxy.ts` at the project root / beside `app`).
- **Request APIs are async** — `params` and `searchParams` are Promises and must be awaited.
- **`fetch` is not cached by default** and will block rendering until it resolves; use `use cache` / `<Suspense>` where needed.
- **Cache Components are opt-in** (`cacheComponents: true`, paired with `partialPrefetching`).
- The app currently uses the **default caching model** (`next.config.ts` is empty).

---

## Installed but not yet used

These are present in `package.json`/`node_modules` but have no code yet — they signal the intended direction:

- `hooks/` and `public/` → empty, ready for custom hooks and static assets.
- `components/ui/button.tsx` → the shadcn Button, not yet wired into the dashboard.

---

## Quick reference

```bash
pnpm install          # install dependencies
pnpm dev              # start dev server (Turbopack)
pnpm dlx shadcn@latest add <name>   # add a shadcn (Base UI) component
pnpm typecheck        # tsc --noEmit
```

For framework behavior, prefer the version-matched docs bundled in this repo:

```bash
ls node_modules/next/dist/docs/01-app/01-getting-started
```
