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

`maplibre-gl` and `recharts` are installed but not yet used in any component — they are the intended building blocks for the map and charting work.

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
│   ├── page.tsx            # Default template page (placeholder)
│   ├── globals.css         # Tailwind import + design tokens (light/dark)
│   └── favicon.ico
├── components/
│   ├── theme-provider.tsx  # next-themes wrapper + "d" dark-mode hotkey
│   └── ui/
│       └── button.tsx      # shadcn Button (Base UI + cva variants)
├── hooks/                  # (empty — custom hooks go here)
├── lib/
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

- `maplibre-gl` → interactive map.
- `recharts` → charts (works with the shadcn chart component).
- `hooks/` and `public/` → empty, ready for custom hooks and static assets.

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
