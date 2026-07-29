# Phase 4, Sub-project 2b — Real Page Preview (X-Ray + Templates): Design

Status: approved
Date: 2026-07-29
Repo: websight-base (extends the existing repo, no new repo)

## Context

Sub-project 2a (`docs/superpowers/specs/2026-07-29-phase4-frontend-data-wiring-design.md`)
wired every tab except X-Ray to real crawl data, and deliberately left
`TemplatesTab`'s selected-template panel as a plain text summary
(pattern + count) rather than the mock's `StackedPreview` layered view —
both explicitly deferred to this sub-project. `XRayTab` itself is
currently **100% hardcoded**: it never reads its `data` prop (it doesn't
even receive one from `App.jsx`) and renders a fake "6 exploded 3D
layers" narrative view of one hand-picked physician page
(`src/lib/xrayContent.jsx`), regardless of what was actually crawled.

This was scoped during Phase 4's original brainstorming as "minimal real
version" — replace the fake layered view with a real one: pick a page,
show its actual captured screenshot and HTML, no 3D/exploded/layer UI,
because that concept has no real equivalent (`websight-crawler` captures
one screenshot + one HTML snapshot per page, not six separate content
layers). This spec covers exactly that, reused by both `XRayTab` and
`TemplatesTab`'s selected-template panel.

### Why this is smaller than it might look

The mock's 6-layer breakdown (Visual, Content/Text, HTML/DOM, CSS/Styles,
Network/APIs, Data/Schema) mostly doesn't survive contact with real
crawl data: `websight-crawler` never captures CSS as a separate artifact,
"Content/Text" would just be the HTML with tags stripped (redundant), and
"Data/Schema" was entirely invented narrative. What's real and available
per page (via PR #4's `GET /api/crawls/:id`, already shipped in
sub-project 1) is exactly two things: a screenshot and the raw HTML. This
spec builds a UI around those two things, not a smaller version of the
six.

## Components

### New

- **`src/components/PagePreview.jsx`** — given a page object
  (`{url, path, screenshotUrl, htmlUrl}`, the exact shape PR #4 already
  returns), renders a browser-chrome-framed screenshot
  (`<img src={screenshotUrl}>`) and, below it, the page's raw HTML:
  fetched and shown inline on success, falling back to a plain
  `<a href={htmlUrl} target="_blank">View raw HTML ↗</a>` link if the
  fetch fails (the R2 bucket's CORS configuration for browser `fetch()`
  is unverified — a plain link is unaffected by CORS since it's a browser
  navigation, not a script-initiated cross-origin request). Handles
  `screenshotUrl`/`htmlUrl` being `null` (a page whose asset upload
  failed, per Phase 3's per-page error handling) with a "No preview
  available" state instead of a broken image or a fetch attempt against
  `null`.
- **`src/components/PagePreview.test.jsx`** — real test coverage (mocked
  `fetch`, matching `src/lib/auth.test.js`'s existing pattern) for the
  fetch-success, fetch-failure, and null-url branches — this component
  has actual logic, unlike the pure prop-rendering tab components that
  stay at this repo's smoke-test bar.

### Modified

- **`src/components/XRayTab.jsx`** — full rewrite. A `<select>` dropdown
  listing the crawl's real pages by `path` (scales cleanly to however
  many pages a real site has, unlike a row of buttons) replaces the fake
  `XRAY_PAGES` tab-picker; `<PagePreview page={selected}/>` replaces the
  entire exploded/layered/zoom/keyboard-shortcut viewport. Takes a new
  `pages` prop.
- **`src/components/tabs/TemplatesTab.jsx`** — the "SELECTED TEMPLATE"
  panel (2a's plain-text placeholder) gains `<PagePreview>` for one
  representative page: the first entry in the selected template's
  `pageUrls` that has a matching row in the `pages` prop. Takes a new
  `pages` prop alongside the existing `data`.
- **`src/lib/crawlMapper.js`** — `mapTemplates(clusters, totalPages)`
  additionally includes `pageUrls: c.pageUrls` in each returned template,
  needed to look up a representative page.
- **`src/App.jsx`** — the `data` object built in `tabContent()` gains
  `pages: crawl.pages`; `<XRayTab pages={data.pages}/>` and
  `<TemplatesTab data={data} pages={data.pages}/>` replace the current
  prop-less/pages-less calls.

### Deleted

- **`src/lib/xrayContent.jsx`** — the hardcoded fake page-content
  generator; nothing references it once `XRayTab` no longer does.
- **`src/components/tabs/StackedPreview.jsx`** — 2a already stopped
  calling it (left it "unmodified and unused... 2b either revives or
  replaces it" per that spec); this sub-project replaces it with
  `PagePreview` rather than reviving it, so it's dead code.

## Error handling

- HTML fetch failure (network error, CORS block, 404, etc.): caught,
  falls back to the "View raw HTML ↗" link — not surfaced as an error
  state, since this is expected/acceptable degradation, not a bug.
- `screenshotUrl` and/or `htmlUrl` are `null`: `PagePreview` shows a "No
  preview available" message for the missing piece rather than a broken
  `<img>` or a fetch attempt against `null`.
- A template whose `pageUrls` has no matching row in `pages` (shouldn't
  normally happen, but not impossible if the API response is
  inconsistent): same "no preview available" treatment as a missing
  screenshot, not a crash.

## Testing

`PagePreview.jsx` gets thorough, real unit/component tests (mocked
`fetch`): renders the screenshot; shows fetched HTML on a successful
fetch; falls back to the link on a failed fetch; shows the "no preview"
state when both URLs are `null`. `XRayTab` and `TemplatesTab` stay at
this repo's existing smoke-test bar (no dedicated test files for pure
prop-driven tab components, per `CLAUDE.md` and 2a's precedent) —
verified via `npm run lint` and a Vite dev-server transform check, same
as 2a's tab-trimming tasks.

## Out of scope (confirmed)

- Any change to `websight-data` or the Crawls API — this sub-project only
  consumes what PR #4 already returns.
- Configuring the R2 bucket's CORS policy — out of this repo's scope
  entirely (a Cloudflare-side setting); the fetch-with-fallback design
  works correctly whether or not it's ever configured.
- Pagination or search on the X-Ray page picker — a plain `<select>` is
  adequate for this pass; a future revisit if real sites prove to have
  too many pages for a dropdown to stay usable.
- Any change to the sitemap/mind-map, Overview, or APIs tabs.
