# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

WebSight is a **fully mocked frontend demo** — a single React SPA that renders a
"website X-ray" dashboard (sitemap mind-map, page templates, detected
third-party APIs, layered X-ray view) for a fake crawl of a healthcare site.

**There is no backend, no crawler, no database, and no live data.** Every
number and screenshot description on screen comes from one hardcoded object
(`BSW` in `src/lib/mockData.js`). Do not assume any API call, fetch, or
persistence layer exists unless you've just added it yourself. See
`ROADMAP.md` for the plan to make this real.

## Stack

- React 19 + Vite 8, plain JSX (no TypeScript — `@types/react` is present only
  for editor intellisense, nothing is type-checked)
- ESLint 10, flat config in `eslint.config.js` (`react-hooks`, `react-refresh`)
- Vitest + React Testing Library + jsdom for tests
- Plain CSS + inline style objects. No Tailwind, no CSS-in-JS library.
- npm (`package-lock.json` is committed)

## Commands

```
npm install       # install deps
npm run dev       # start Vite dev server (default port 5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint      # eslint .
npm run test      # vitest run
```

## Architecture

The app is componentized under `src/`:

- `src/lib/theme.js` — the `T` design-token object (colors, fonts) and small
  helpers (`hex2rgb`, `pct`, `fmt`, `trunc`), used everywhere via inline
  `style={{...}}` props, not CSS classes.
- `src/lib/mockData.js` — the hardcoded `BSW` mock dataset: domain metadata,
  sitemap `nodes`, page `templates` (each with an X-ray `layers` array),
  detected `apis`, etc. This is the thing a real backend will eventually
  replace.
- `src/lib/xrayContent.jsx` — the fake per-page-type visual/HTML/CSS/API/data
  layer content used by the X-Ray tab.
- `src/components/ui/` — shared atoms (`Badge`, `Chip`).
- `src/components/` — `Sidebar`, `MindMap`, `XRayTab`, `Fonts`.
- `src/components/tabs/` — one file per dashboard tab: `OverviewTab`,
  `SitemapTab`, `TemplatesTab` (+ `StackedPreview`), `APIsTab`, `ExportTab`.
- `src/App.jsx` — just the root component: tab switching, the fake
  analyze/loading sequence, and composing the pieces above.
- `*.test.jsx` files sit next to the component they test (e.g.
  `src/components/Sidebar.test.jsx`). `src/test/setup.js` wires up
  `@testing-library/jest-dom` matchers and RTL's `cleanup` between tests.

`src/main.jsx` just mounts `<App/>`. `index.html` is the Vite entry point.

## Conventions

- Keep new UI consistent with the existing inline-style + `T` token approach
  — don't introduce a second styling system ad hoc.
- One component per file under `src/components/`; shared data/logic goes in
  `src/lib/`, not inline in a component.
- Run `npm run lint` and `npm run test` before considering frontend changes
  done.
- If you add real data fetching, backend calls, or new dependencies, update
  this file and `ROADMAP.md` so future sessions don't work from stale
  assumptions.
