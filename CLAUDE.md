# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

WebSight is a **fully mocked frontend demo** — a single React SPA that renders a
"website X-ray" dashboard (sitemap mind-map, page templates, detected
third-party APIs, layered X-ray view) for a fake crawl of a healthcare site.

**There is no backend, no crawler, no database, and no live data.** Every
number and screenshot description on screen comes from one hardcoded object
(`BSW` in `src/App.jsx`). Do not assume any API call, fetch, or persistence
layer exists unless you've just added it yourself. See `ROADMAP.md` for the
plan to make this real.

## Stack

- React 19 + Vite 8, plain JSX (no TypeScript — `@types/react` is present only
  for editor intellisense, nothing is type-checked)
- ESLint 10, flat config in `eslint.config.js` (`react-hooks`, `react-refresh`)
- Plain CSS + inline style objects. No Tailwind, no CSS-in-JS library.
- npm (`package-lock.json` is committed)

## Commands

```
npm install       # install deps
npm run dev       # start Vite dev server (default port 5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint      # eslint .
```

There is **no test command** — no test framework is configured yet (Phase 1
of `ROADMAP.md`). Don't assume `npm test` works.

## Architecture

Almost the entire app lives in `src/App.jsx` (~1000 lines):

- `T` — the design-token object (colors, fonts) used everywhere via inline
  `style={{...}}` props, not CSS classes.
- `Badge`, `Chip` — small shared UI atoms defined at the top of the file.
- `BSW` — the hardcoded mock dataset: domain metadata, sitemap `nodes`,
  page `templates` (each with an X-ray `layers` array), detected `apis`, etc.
  This is the thing a real backend will eventually replace.
- The rest of the file is the tabbed dashboard itself (Overview, Sitemap,
  Templates, X-Ray, APIs, Export tabs) reading from `BSW`.

`src/main.jsx` just mounts `<App/>`. `index.html` is the Vite entry point.

## Conventions

- Keep new UI consistent with the existing inline-style + `T` token approach
  unless you're doing the Phase 1 componentization/styling overhaul from
  `ROADMAP.md` — don't introduce a second styling system ad hoc.
- Run `npm run lint` before considering frontend changes done.
- If you add real data fetching, backend calls, or new dependencies, update
  this file and `ROADMAP.md` so future sessions don't work from stale
  assumptions.
