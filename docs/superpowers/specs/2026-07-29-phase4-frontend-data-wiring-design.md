# Phase 4, Sub-project 2a — Frontend Data Wiring: Design

Status: approved
Date: 2026-07-29
Repo: websight-base (extends the existing repo, no new repo)

## Context

`ROADMAP.md`'s Phase 4 is "wire the frontend to the real backend": replace the
hardcoded `BSW` mock (`src/lib/mockData.js`) with real crawl data, and add a
real "enter a domain to crawl" flow instead of the fixed `bswhealth.com`
demo. `websight-data` now has that backend surface —
`docs/superpowers/specs/2026-07-29-phase4-crawls-api-design.md`'s
`POST /api/crawls`, `GET /api/crawls`, `GET /api/crawls/:id` — merged as
part of this same session's work.

Phase 4 was split into two frontend sub-projects during brainstorming
because it covers two genuinely different kinds of work: wiring the data
pipes, and building a wholly new "show a real page's screenshot" UI
capability. This spec is the first, **2a**: the API client, the real
domain-input/polling flow, and real data for every tab whose fields map
cleanly onto what a crawl actually produces. **2b** (not yet speced) will
replace the mock's fake 6-layer X-Ray view and `StackedPreview`'s
layer-anatomy view with a real screenshot/HTML viewer, reused by both
Templates and X-Ray.

### The mock-to-real gap, and what this spec does about it

Reading the current tab components against `websight-crawler`'s actual
output (`CrawlResult`: `pages`, `clusters`, `integrations` — structural/
technical data only) surfaced a real gap: several mock fields are
hand-authored narrative that no automated crawler can produce —
`OverviewTab`'s `industry`/`summary`/`tags`/`tech`, `TemplatesTab`'s
per-template `features`/`layers` (the whole API-attribution anatomy
breakdown), `APIsTab`'s `confidence`/`purpose`/`method`/`trigger`. Decision
(confirmed): **simplify to what's real** — these fields and the UI blocks
that render them are removed, not stubbed with placeholder text. This
keeps the app honest about what it actually knows, at the cost of a
visually thinner dashboard than the current mock demo.

## Architecture

```
User types a domain, clicks Analyze
        │
        ▼
createCrawl({domain, guestToken|clerkToken})   src/lib/crawls.js
        │  (quota check + consume + enqueue, per PR #4's combined endpoint)
        ▼
{crawlId, remainingScans}
        │
        ▼
poll getCrawl(crawlId, ...) every 2s            src/lib/crawls.js
        │
        ├─ status: queued/running → real loading text, keep polling
        │
        ├─ status: failed → show crawl.error in the existing
        │     generic error-panel + Retry pattern
        │
        └─ status: done → map via src/lib/crawlMapper.js
                  │
                  ▼
          real props into Overview/Sitemap/Templates/APIs tabs
                  (X-Ray untouched — 2b)
```

`listCrawls()` backs the sidebar's project list. On reaching the dashboard
view, the app fetches it; if the caller (guest token or Clerk user) has
any prior crawl, the most recent one is auto-loaded so a returning user
sees a result immediately, mirroring the current mock's "always show
something" feel without faking it. With no prior crawl, the dashboard
shows an empty state ("Enter a domain above and click Analyze") instead of
defaulting to any tab content — there is no more always-on `BSW` fallback.

## Components

### New

- **`src/lib/crawls.js`** — `createCrawl({domain, guestToken, clerkToken}) → {crawlId, remainingScans}`, `getCrawl(id, {guestToken, clerkToken}) → crawl detail`, `listCrawls({guestToken, clerkToken}) → {crawls: [...]}`. Same conditional guest-vs-Bearer pattern `consumeScan`/`fetchMe` already use in `auth.js`; guest identity goes in the body for `POST`, as a `?guestToken=` query param for the two `GET`s (matching PR #4's API, which can't read a body on a GET).
- **`src/lib/crawlMapper.js`** — pure functions, no component/React dependency, straightforward to unit test thoroughly (unlike this repo's smoke-level component tests):
  - `mapMetrics(crawl) → {pages, sections, templates, apis, crawlTime}` — `sections` = count of top-level sitemap nodes (see `buildSitemapNodes`); `crawlTime` = `finishedAt - startedAt`, formatted (e.g. `"3.2s"`).
  - `buildSitemapNodes(pages) → nodes[]` — groups pages by URL path segment into a real hierarchy (root = domain; each path segment becomes a node, parented to the previous segment; `count` = number of real pages under that prefix). Replaces the mock's hand-authored `nodes[]` tree with real structure derived from actual crawled URLs.
  - `mapTemplates(clusters, totalPages) → templates[]` — `{id, name: urlPattern, count: pageUrls.length, total: totalPages, pattern: urlPattern, color: palette[i % palette.length]}`. No `features`/`layers`/`apis` (per the simplify-to-real decision).
  - `mapIntegrations(integrations) → apis[]` — `{name, type: category, color: palette[i % palette.length], endpoints: matchedUrls}`. No `confidence`/`purpose`/`method`/`trigger`.
  - `mapProjects(crawlsListResponse) → projects[]` — `{id, name: domain, status, date: formatted startedAt}`. No `score`.
  - A small fixed color palette (reused from the mock's existing template/API colors) is a module-level constant in this file, assigned by index — there's no real "detected color" concept, this is purely a rendering choice.

### Modified

- **`src/lib/auth.js`** — export the existing (currently module-private) `apiFetch` so `crawls.js` can reuse it instead of duplicating a fetch wrapper.
- **`src/App.jsx`** — replace the `BSW`-backed `data` state with real `crawl`/`crawlId` state; `handleAnalyzeClick` calls `createCrawl` directly (the standalone `consumeScan` call is removed — `createCrawl` subsumes quota consumption per PR #4); a new polling `useEffect` replaces the fake `STEP_LABELS` timer; dashboard entry fetches `listCrawls()` and auto-loads the most recent crawl if one exists; an empty state renders when there's no crawl to show.
- **`src/components/tabs/OverviewTab.jsx`** — remove the `industry`/`summary`/`tags`/`tech` blocks.
- **`src/components/tabs/TemplatesTab.jsx`** — remove the `features` chip row; replace `<StackedPreview template={sel}/>` with a plain text summary (pattern + page count) for the selected template. `StackedPreview.jsx` itself is left unmodified and unused — 2b either revives or replaces it.
- **`src/components/tabs/APIsTab.jsx`** — remove the confidence badge and `purpose`/`method`/`trigger` detail rows; keep name/type badge/endpoints.
- **`src/components/Sidebar.jsx`** — `projects` prop now holds real rows from `mapProjects()`; the hardcoded `p.name==="bswhealth.com"` highlight check becomes a comparison against the currently-loaded `crawlId`.

### Unchanged in this sub-project

- `src/components/XRayTab.jsx`, `src/lib/xrayContent.jsx`, `src/components/tabs/StackedPreview.jsx` — 2b.
- `src/components/tabs/ExportTab.jsx` — no backend capability exists for export/share; out of scope entirely, not just deferred.
- `src/lib/mockData.js` (`BSW`) — left in place but no longer imported by `App.jsx`; removing the file entirely is a follow-up once 2b also stops needing any mock-shaped reference data.

## Error handling

- `402` from `createCrawl` (quota exceeded): unchanged — same `UpsellNotice` path the existing `consumeScan` 402 already renders, since PR #4 preserved the exact same error body shape.
- `crawl.status === 'failed'`: shows `crawl.error` via the existing generic error-panel + Retry pattern (previously only reachable for a `createCrawl`-level network error; now also reachable for a crawl that started but failed mid-run).
- A single polling tick that fails (network blip) is swallowed and retried on the next tick — only a real `failed` status, or a small number of consecutive poll failures (3), surfaces an error to the user.
- `listCrawls()` failing on dashboard entry: falls back to an empty sidebar project list and the empty dashboard state, rather than blocking the whole view — matches the existing pattern where `access.error` degrades gracefully instead of hard-failing the page.

## Testing

This repo's existing bar (per `CLAUDE.md`) is smoke-level component tests
(RTL: renders without crashing, key interactions fire) — kept as-is for
component tests. `crawlMapper.js`'s pure functions get real, thorough unit
tests instead (no rendering involved, cheap to test exhaustively):

- `buildSitemapNodes`: single-page site (root only), multi-segment paths,
  siblings under the same parent, correct counts at each level.
- `mapTemplates`/`mapIntegrations`/`mapProjects`/`mapMetrics`: field
  mapping correctness, color assignment wraps around the palette,
  `crawlTime` formatting for sub-second/multi-second/multi-minute
  durations.
- `src/lib/crawls.js`: mirrors `auth.test.js`'s existing pattern — mocked
  global `fetch`, asserts request method/URL/body/headers and
  success/error response handling for each of the three functions.
- `App.test.jsx`: rewritten (not incrementally patched — the underlying
  flow it exercises changes substantially) to mock `createCrawl`/
  `getCrawl`/`listCrawls` instead of `consumeScan`, and to assert on the
  real polling-driven loading text and empty/populated dashboard states
  instead of the fixed 6-step, 500ms-per-step fake timer.
- `Sidebar.test.jsx`: updated for the new `crawlId`-based highlight prop
  instead of the hardcoded `"bswhealth.com"` string match.
- `OverviewTab`/`TemplatesTab`/`APIsTab` smoke tests: updated fixtures
  reflecting the trimmed real-data shape (no `industry`/`summary`/`tags`/
  `tech`/`features`/`confidence`/`purpose`/`method`/`trigger`).

## Out of scope (confirmed)

- X-Ray tab redesign and `StackedPreview`'s real-screenshot replacement —
  sub-project 2b.
- Export/share functionality — no backend capability exists; not a
  deferred real feature, just unbuilt.
- Letting a user click an old sidebar project to revisit it (2a always
  shows the most recent crawl on load, or whatever's freshly analyzed) —
  a reasonable fast-follow, not required for this pass.
- Removing `src/lib/mockData.js` entirely — left in place until 2b no
  longer needs any mock-shaped reference.
- Any change to `websight-data` — this spec only consumes PR #4's already-
  built API.
