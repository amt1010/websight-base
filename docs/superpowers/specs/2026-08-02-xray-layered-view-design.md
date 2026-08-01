# X-Ray Tab — Derived Layered View: Design

Status: approved
Date: 2026-08-02
Repo: websight-base

## Context

`docs/superpowers/specs/2026-07-29-phase4-xray-screenshot-preview-design.md`
("2b") replaced the original mocked 6-layer exploded X-Ray view
(`src/lib/xrayContent.jsx`, deleted) with a plain screenshot + raw-HTML
`PagePreview`, reasoning that `websight-crawler` only captures a
screenshot and one HTML snapshot per page — no separate CSS artifact, no
network-request log, no structured-data extraction — so a 6-layer
breakdown "doesn't survive contact with real data."

This spec revisits that conclusion, not by asking the crawler to capture
more (out of scope, a separate repo), but by **deriving** the missing
layers client-side from the HTML snapshot `PagePreview` already fetches.
`translucentweb.site` was used as a reference for the interaction model
(a numbered layer toolbar, an "exploded" stacked view, scroll-to-navigate
between layers) — not as a source of real content. The goal is an X-Ray
tab that, for any real crawled page, shows:

- **Visual Render** — the captured screenshot (already real, unchanged)
- **HTML / DOM** — the captured raw HTML (already real, unchanged)
- **Content / Text** — visible text extracted from that HTML
- **CSS / Styles** — inline `<style>` contents + linked stylesheet URLs, extracted from that HTML
- **Data / Schema** — JSON-LD blocks + meta tags, extracted from that HTML
- **Network / APIs** — external resource URLs (`script`/`link`/`img`/`iframe` `src`/`href`) referenced in that HTML, explicitly labeled as *referenced resources*, not a live request/response capture (which this app has no way to record)

No new backend calls, no new dependency, no change to `websight-crawler`
or `websight-data`.

## Architecture

```
XRayTab picks a page (unchanged: <select> of crawl.pages)
        │
        ▼
XRayLayers(page)                          src/components/XRayLayers.jsx
        │
        ├─ useHtmlText(page.htmlUrl)      (existing hook, unchanged)
        │
        ├─ deriveLayers(html)             src/lib/xrayLayers.js (new, pure)
        │     → { text, css, schema, resources }
        │
        └─ LAYER_DEFS.map(def => ({ ...def, available: def.hasContent(derived) }))
                  │
                  ▼
        toolbar (only `available` layers) + active layer panel
        scroll wheel over the panel cycles active layer among `available` entries
        "Explode" toggle renders all `available` layers as an offset CSS-transform stack
```

`LAYER_DEFS` is an ordered array, not a fixed set of 6 named slots:

```js
// shape, not final code
const LAYER_DEFS = [
  { id: "visual", label: "Visual Render", hasContent: () => true, render: (p, derived) => <ScreenshotPanel .../> },
  { id: "text", label: "Content / Text", hasContent: (d) => d.text.length > 0, render: (d) => <TextPanel .../> },
  { id: "html", label: "HTML / DOM", hasContent: () => true, render: (p) => <HtmlPanel .../> },
  { id: "css", label: "CSS / Styles", hasContent: (d) => d.css.inline || d.css.linked.length > 0, render: (d) => <CssPanel .../> },
  { id: "network", label: "Network / APIs", hasContent: (d) => d.resources.length > 0, render: (d) => <ResourcesPanel .../> },
  { id: "schema", label: "Data / Schema", hasContent: (d) => d.schema.jsonLd.length > 0 || d.schema.meta.length > 0, render: (d) => <SchemaPanel .../> },
];
```

A layer whose `hasContent` returns `false` for the current page is left out
of the toolbar and the exploded stack entirely (not shown as an empty
panel) — this is what makes the layer count vary per page rather than
being fixed at 6, and what lets a future layer just be another array
entry with no toolbar/explode-view rework.

## Components

### New

- **`src/lib/xrayLayers.js`**
  - `deriveLayers(html)` — pure function, `DOMParser`-based:
    - `text`: `body.textContent` with `<script>`/`<style>` nodes removed first, whitespace collapsed.
    - `css`: `{ inline: concatenated <style> textContent, linked: [href, ...] from <link rel="stylesheet">, ordered by document order }`.
    - `schema`: `{ jsonLd: [parsed JSON.parse'd contents of <script type="application/ld+json">, skipping any that fail to parse], meta: [{name, content}] from meta[name] / meta[property] starting with "og:", "twitter:", or equal to "description" }`.
    - `resources`: `[{ url, type }]` deduped by URL, `type` ∈ `script | stylesheet | image | iframe`, from `script[src]`, `link[rel=stylesheet][href]`, `img[src]`, `iframe[src]`.
    - `html` is `null`/empty → all fields return their empty form (`""`, `[]`), never throws.
  - `LAYER_DEFS` — the array above, plus the actual `render` wiring against the panel components below (kept in `XRayLayers.jsx` if that reads cleaner once written — the split is an implementation detail, not load-bearing for this spec).

- **`src/lib/xrayLayers.test.js`** — thorough unit tests for `deriveLayers`: JSON-LD present/absent/malformed, meta tags of each recognized kind, inline-only CSS, linked-only CSS, both, neither, resource extraction across all 4 tag types with dedup, and empty/`null` HTML input.

- **`src/components/XRayLayers.jsx`** — replaces `PagePreview` inside `XRayTab`. Props: `{ page }` (same shape as today: `{url, path, screenshotUrl, htmlUrl}`).
  - Fetches HTML via the existing `useHtmlText` hook (same fetch-fails-falls-back-to-link behavior `PagePreview` already has).
  - Computes `derived = deriveLayers(html)` (memoized on `html`) and `availableLayers = LAYER_DEFS.filter(d => d.hasContent(derived))`.
  - State: `activeLayerId` (defaults to `"visual"` on page change), `exploded` (boolean, defaults `false`).
  - Toolbar: one button per `availableLayers` entry, highlighting `activeLayerId`; an "Explode" toggle button alongside.
  - Flat mode (`exploded === false`): renders the single active layer's panel full-width via its `render` function.
  - Exploded mode (`exploded === true`): renders every `availableLayers` panel simultaneously, each wrapped in a container with a CSS `transform` (`perspective(...) rotateX(...) rotateY(...) translate3d(...)`) offsetting it back-to-front by its index, decreasing `opacity` toward the back. Clicking a panel in this mode sets it `active` and turns `exploded` off.
  - Wheel handling: an `onWheel` handler on the layer viewport moves `activeLayerId` to the next/previous entry in `availableLayers` (wheel down → next, up → previous, clamped at the ends, no wraparound) — active in both flat and exploded mode.
  - Panel implementations (small internal components, not separately exported):
    - `ScreenshotPanel` — reuses `PagePreview`'s existing browser-chrome-framed `<img>` block (including its "Screenshot unavailable"/"No screenshot available" states).
    - `HtmlPanel` — reuses `PagePreview`'s existing HTML `<pre>` block (including its loading/fetch-failed-link states).
    - `TextPanel` — `derived.text` in a scrollable plain-text block, same visual treatment (`T.mono`/`T.body`, card background) as the HTML panel.
    - `CssPanel` — inline CSS in a `<pre>` code block; linked stylesheet URLs as a plain list below it.
    - `ResourcesPanel` — `derived.resources` grouped by `type` under small headings, each URL as a link-styled row; a fixed caption line: *"Resources referenced in this page's HTML — not a live network capture."*
    - `SchemaPanel` — each `derived.schema.jsonLd` entry pretty-printed (`JSON.stringify(_, null, 2)`) in its own `<pre>` block; `derived.schema.meta` as a two-column key/value list below.
  - If HTML failed to load or `htmlUrl` is `null`: `availableLayers` collapses to just `visual` (assuming `screenshotUrl` exists) — every other layer's `hasContent` naturally returns `false` on empty-string HTML, so this falls out of the existing derivation logic without a separate branch. If `screenshotUrl` is also missing/`null`, fall through to `PagePreview`'s existing "No preview available" empty state (reused as-is for the fully-empty case).

- **`src/components/XRayLayers.test.jsx`** — component tests at the same bar as the existing `PagePreview.test.jsx` (mocked `fetch`): toolbar renders only layers with content for a given HTML fixture; clicking a toolbar button switches the active panel; wheel events step through `availableLayers` in order and clamp at the ends; explode toggle renders all available panels; a panel click while exploded activates it and exits explode; HTML fetch failure leaves only the Visual Render layer available; fully-empty page (`null` screenshot + `null` html) falls back to the existing "No preview available" state.

### Modified

- **`src/components/XRayTab.jsx`** — swap `<PagePreview page={selected}/>` for `<XRayLayers page={selected}/>`. No other change; the page-picker `<select>` is unchanged.
- **`CLAUDE.md`** — add `src/lib/xrayLayers.js` and `src/components/XRayLayers.jsx` to the architecture bullet list, noting they derive the X-Ray tab's Content/CSS/Schema/Network layers client-side from the same HTML `PagePreview` already fetches (no new backend call).

### Unchanged

- **`src/components/PagePreview.jsx`** — stays exactly as-is, still used by `TemplatesTab`'s "representative page" panel. `XRayLayers`' `ScreenshotPanel`/`HtmlPanel` visually match its existing blocks but are separate small components (not a shared extraction) to avoid coupling `PagePreview`'s prop contract to the new layer system for a marginal reuse win.
- **`src/lib/useHtmlText.js`**, **`src/lib/crawls.js`**, **`src/lib/crawlMapper.js`**, `websight-crawler`, `websight-data` — no changes anywhere in the data pipeline.

## Error handling

- `htmlUrl` fetch fails (network/CORS/404): same fallback `useHtmlText` already provides. `deriveLayers("")` (empty HTML) naturally yields no content for every derived layer, so the toolbar reduces to just Visual Render — no separate error branch needed in `XRayLayers`.
- `htmlUrl` is `null`: same as above — treated identically to a failed fetch for derivation purposes.
- `screenshotUrl` is `null`/broken: `ScreenshotPanel` shows the same "No screenshot available"/"Screenshot unavailable" states `PagePreview` already has.
- Both missing: fall back to `PagePreview`'s existing "No preview available" empty state.
- Malformed JSON-LD (`JSON.parse` throws): that individual block is skipped, not surfaced as an error — one bad block shouldn't hide the rest of the Data/Schema layer.

## Testing

- `npm run lint` and `npm run test` per `CLAUDE.md`.
- `src/lib/xrayLayers.test.js`: thorough, pure-function unit tests (per the repo's existing convention for `src/lib/*` logic, e.g. `crawlMapper.test.js`).
- `src/components/XRayLayers.test.jsx`: component-level tests matching `PagePreview.test.jsx`'s bar (mocked `fetch`), covering the interaction list above.
- Manual verification in a running dev server against a real crawled page before calling this done, per `CLAUDE.md`'s UI-change testing requirement.

## Out of scope (confirmed)

- Any change to `websight-crawler` or `websight-data` — everything here derives from data already returned by the existing `GET /api/crawls/:id`.
- A true network-request/response capture — the Network/APIs layer is permanently a "resources referenced in HTML" approximation, labeled as such.
- Changing `TemplatesTab`'s representative-page panel — it keeps using `PagePreview` unmodified.
- Draggable/scrubbable 3D camera movement, true perspective scroll-through, or any animation library — the exploded view is a static CSS-transform layout, not a scroll-driven 3D scene like the `translucentweb.site` reference.
