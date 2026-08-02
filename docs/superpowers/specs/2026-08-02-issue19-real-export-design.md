# Issue #19 — Real Export Functionality: Design

Status: approved
Date: 2026-08-02
Repo: websight-base
Issue: https://github.com/amt1010/websight-base/issues/19

## Context

`ExportTab.jsx` renders four export cards (PDF Discovery Report, CSV URL
inventory, JSON raw analysis, Figma sitemap kit) and a "Share &
Collaborate" link box. None of it does anything: no card has an `onClick`,
the share link is a hardcoded string (`bswhealth-2026-06-15`), and the
"Copy link" button has no handler. `ExportTab` doesn't even receive the
`data` prop every other tab gets — it's pure decoration.

There is no export/share backend capability (confirmed: absent from
`src/lib/auth.js`, and explicitly called out as unbuilt — not deferred —
in this project's `2026-07-29-phase4-frontend-data-wiring-design.md`).

## Decision: make real what's real, remove what isn't

- **CSV** and **JSON** are fully real to build client-side right now, from
  the same `data` object (`{domain, metrics, nodes, templates, apis,
  pages}`) already computed in `App.jsx` and passed to every other tab.
- **PDF** has no library in this project and adding one is avoidable: the
  browser's native print-to-PDF, aimed at a small self-contained printable
  document (not the live dark-theme dashboard chrome), is a genuine,
  dependency-free way to produce a PDF.
- **Figma sitemap kit** and **Share & Collaborate** are not realistically
  buildable in this pass — Figma's kit format has no clear
  library/spec path to implement correctly, and sharing needs backend
  persistence that doesn't exist. Per this project's established
  precedent (`2026-07-29-phase4-frontend-data-wiring-design.md`:
  "simplify to what's real... removed, not stubbed with placeholder
  text"), these are **removed from the UI**, not left as relabeled mocks.

## Architecture

```
ExportTab({data})
  ├─ "PDF Discovery Report" → openPrintableReport(data)
  │     window.open("", "_blank") → writes buildReportHtml(data) → .print()
  ├─ "CSV — URL inventory"  → downloadFile(`${data.domain}-urls.csv`, buildCsv(data.pages), "text/csv")
  └─ "JSON — raw analysis"  → downloadFile(`${data.domain}-analysis.json`, JSON.stringify(data,null,2), "application/json")
```

All four helper functions live in a new pure(ish) module,
`src/lib/exportData.js` — `buildCsv` and `buildReportHtml` are pure string
builders (fully unit-testable); `downloadFile` and `openPrintableReport`
are thin DOM/window side-effect wrappers around them.

## Components

### New

- **`src/lib/exportData.js`**
  - `buildCsv(pages) → string` — header row `url,path,depth,status`, one
    row per page. Fields are CSV-quoted (wrapped in `"..."` with internal
    `"` doubled) whenever they contain a comma, quote, or newline —
    correctness, not over-engineering, since URLs can legitimately contain
    commas in query strings.
  - `buildReportHtml(data) → string` — a complete, self-contained
    `<html>...</html>` document: `data.domain` as the title/heading,
    `data.metrics` (pages/sections/templates/apis/crawlTime) as a simple
    stat list, `data.templates` (name, pattern, count) as a table,
    `data.apis` (name, type, endpoints) as a table. Plain light-background/
    black-text inline styles — print output shouldn't inherit the
    dashboard's dark theme. No screenshots or X-ray content — too
    unreliable to print consistently from async-loaded images, and out of
    scope for this pass.
  - `downloadFile(filename, content, mimeType)` — `new Blob([content],
    {type: mimeType})` → `URL.createObjectURL` → a temporary `<a
    download>` click → `URL.revokeObjectURL`. Standard browser-download
    pattern.
  - `openPrintableReport(data)` — `window.open("", "_blank")`, `.write(
    buildReportHtml(data))`, `.close()`, `.print()`. Called synchronously
    from the button's `onClick` (required for the popup not to be
    blocked).
- **`src/lib/exportData.test.js`** — thorough unit tests for `buildCsv`
  (header, rows, quoting/escaping cases) and `buildReportHtml` (contains
  domain, each metric value, each template name, each API name), matching
  this repo's convention for pure `src/lib/*` logic.
- **`src/components/tabs/ExportTab.test.jsx`** (new — `ExportTab` now has
  real logic, unlike this repo's other prop-driven tabs, earning dedicated
  tests per the precedent set by `PagePreview.test.jsx`/
  `XRayLayers.test.jsx`): clicking CSV/JSON triggers a download (assert
  `URL.createObjectURL` is called with the right mime type, and that the
  clicked anchor's `download` attribute matches the expected filename);
  clicking PDF calls `window.open` and the opened window's `print` method;
  the Figma card and the Share & Collaborate block are absent from the
  rendered output.

### Modified

- **`src/components/tabs/ExportTab.jsx`** — takes a `data` prop. The
  `exports` array drops the Figma entry; the remaining three each get a
  real `onClick`. The entire "SHARE & COLLABORATE" block is deleted. The
  PDF card's description text is adjusted to describe what it actually
  contains (metrics/templates/APIs — not "X-ray views", which isn't
  included).
- **`src/App.jsx`** — `case"export": return<ExportTab data={data}/>;`
  replaces the current prop-less call.

## Error handling

- `data.pages`/`data.templates`/`data.apis` empty arrays: `buildCsv`
  produces a header-only CSV; `buildReportHtml` renders empty
  sections/tables rather than crashing — no page has zero `data.domain`,
  since `ExportTab` is only ever reached with a completed crawl (same
  precondition every other tab already relies on).
- `window.open` returning `null` (a popup actually blocked despite the
  synchronous-click precaution, or the browser otherwise refusing):
  `openPrintableReport` guards with `if (!win) return;` — no crash, no
  error surfaced (matches this repo's existing pattern of quiet,
  non-blocking degradation for non-critical failures, e.g. `PagePreview`'s
  HTML-fetch-failure fallback).

## Testing

- `src/lib/exportData.test.js` and `src/components/tabs/ExportTab.test.jsx`
  as described above.
- `npm run lint` and `npm run test` before considering this done, per
  `CLAUDE.md`.

## Out of scope (confirmed)

- Any backend work (a real share-link/export-persistence API) — issue #19
  is about the frontend not lying about what it can do, not about adding
  new backend capability.
- A real Figma-compatible export.
- Embedding X-ray screenshots or per-page HTML in the PDF report.
- A dedicated PDF library — the print-to-PDF approach is deliberately
  dependency-free.
