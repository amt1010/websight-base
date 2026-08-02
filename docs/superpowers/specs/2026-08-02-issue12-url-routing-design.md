# Issue #12 — URL Routing Per Section: Design

Status: approved
Date: 2026-08-02
Repo: websight-base
Issue: https://github.com/amt1010/websight-base/issues/12

## Context

Every dashboard section (Overview, Sitemap, Templates, X-Ray, APIs, Export)
is currently a `tab` string held in `App.jsx` local state, switched via
`Sidebar`'s `onClick={()=>setTab(n.id)}`. There is no URL for any of it —
the whole dashboard lives at whatever single URL the SPA was loaded at.
Issue #12 asks for each section to be a real, unique, bookmarkable/
shareable URL (`/overview`, `/sitemap`, `/x-ray`, etc.), with the browser's
back/forward buttons working as expected.

There is no routing library in this project today (`package.json` has no
`react-router-dom` or equivalent).

## Architecture

`react-router-dom` (new dependency) is added. `App.jsx`'s default export
becomes a thin wrapper that mounts `<BrowserRouter>`, so `App.test.jsx`
(which renders `<App/>` directly, not through `main.jsx`) keeps working
unmodified — `main.jsx` itself needs no changes.

```
export default function App(){ return <BrowserRouter><AppShell/></BrowserRouter>; }
```

`AppShell` (renamed from today's `App` function body) contains everything
that exists today, plus routing:

```
<Routes>
  <Route path="/" element={<HomePage onGuestAccess={handleGuestAccess}/>} />
  <Route path="/:slug" element={<DashboardRoute .../>} />
  <Route path="*" element={<Navigate to="/" replace/>} />
</Routes>
```

`DashboardRoute` resolves `useParams().slug` to an internal tab id via a
slug↔id table (`src/lib/routes.js`, new). An unrecognized slug redirects to
`/`. A recognized slug with no active session (`!isSignedIn &&
!access.tier`) also redirects to `/` — this is what protects a deep link
like `/templates` from someone who never logged in or continued as guest.
Otherwise it renders exactly what `tabContent()` renders today, with `tab`
now equal to the resolved id instead of a state value.

**Navigation stays imperative, not declarative**, to avoid a redirect race:
the three places that currently call `setView("dashboard")` /
`setView("home")` — the Clerk `isSignedIn` effect, `handleGuestAccess`,
`handleLogout` — call `navigate(...)` instead, at the same call sites, with
one added guard: the `isSignedIn` effect only navigates to `/overview` when
`location.pathname === "/"`, so a signed-in user who lands directly on
`/apis` (deep link, browser refresh, bookmark) stays on `/apis` instead of
being bounced to `/overview`. This mirrors today's exact `setView` call
sites 1:1 — there is deliberately no continuously-re-evaluated "redirect to
dashboard if authenticated" render logic on the `/` route itself, because
that shape of logic races with the async `signOut()` call in
`handleLogout` (isSignedIn can still read `true` for a tick after
`signOut()` is awaited, which would immediately bounce the user straight
back to the dashboard they just logged out of).

`Sidebar.jsx` is **unchanged**: it keeps its existing `tab`/`setTab` prop
contract. `AppShell` derives `tab` from the resolved route and passes a
`setTab` that calls `navigate(TAB_SLUGS[id])`.

## Components

### New

- **`src/lib/routes.js`** — `TAB_SLUGS: {overview, sitemap, templates,
  xray, apis, export} → slug` (only `xray` differs from its id, mapping to
  `"x-ray"`, matching the issue's own example) and `SLUG_TABS`, its
  inverse. `DEFAULT_TAB = "overview"`.

### Modified

- **`src/App.jsx`** — split into the `App`/`AppShell` pair described above.
  `view` state is removed entirely (routing replaces it). The `tab` state
  is removed; `tab` is derived from `useParams()` inside a new
  `DashboardRoute` component (defined in this file, not exported). The
  `<select>`/nav-driven tab switching that currently calls `setTab` now
  calls the `navigate`-backed `setTab` passed to `Sidebar`. `handleSetTab`
  (which today also clears `analyzeError`) keeps that responsibility,
  wrapping the navigate call.
- **`package.json`** — add `react-router-dom` (latest stable major,
  compatible with React 19).
- **`CLAUDE.md`** — note the new routing dependency and `src/lib/routes.js`
  in the Stack/Architecture sections.

### Unchanged

- `src/components/Sidebar.jsx`, `Sidebar.test.jsx` — no prop contract
  change.
- Every tab component (`OverviewTab`, `SitemapTab`, `TemplatesTab`,
  `XRayTab`, `APIsTab`, `ExportTab`) and `tabContent()`'s switch logic.
- `src/main.jsx` — `BrowserRouter` lives inside `App.jsx`, not here.

## Error handling

- Unrecognized slug (typo, stale bookmark) → redirect to `/`.
- Recognized slug, no session → redirect to `/` (deep-link protection).
- Recognized slug, session present, but tab is paid-gated
  (`RESTRICTED_TABS`) and user isn't paid → unchanged: renders
  `UpsellNotice` in place, exactly like today's inline gating. The URL
  still reflects the requested section; only the content is gated.

## Known, accepted limitation

If an already-authenticated user navigates back to `/` later in the same
session (e.g. the browser back button), they see the Home page again
rather than being auto-bounced to the dashboard — the redirect-to-dashboard
logic only fires on the sign-in transition (or guest-access grant), not
continuously. Making `/` continuously self-redirect when authenticated is
exactly the shape of logic that causes the logout race described above, and
this edge case is outside what issue #12 actually asked for. Not fixed in
this pass.

## Testing

- `App.test.jsx`: existing tests should all still pass unmodified (same
  rendered content per state) — the refactor is written to be
  behavior-preserving for everything already covered, since `BrowserRouter`
  lives inside `App` and every test renders `<App/>` directly (no test
  changes needed for router setup, no `MemoryRouter` needed since every
  existing test starts at `/` and navigates via clicks, matching real
  usage).
- New tests added to `App.test.jsx`: clicking a Sidebar nav item updates
  `window.location.pathname`; visiting a dashboard path directly
  (`window.history.pushState` before render, or an equivalent deep-link
  simulation) with no session redirects to `/`; a signed-in user whose
  session is active at mount on a non-`/` dashboard path stays on that path
  instead of being redirected to `/overview`.
- `npm run lint` and `npm run test` before considering this done, per
  `CLAUDE.md`.

## Out of scope (confirmed)

- Encoding the active crawl id in the URL (e.g. `?crawl=123`) — issue #12
  only asks for section-level routing, not per-crawl routing.
- Fixing the known limitation above.
- Any change to `Sidebar.jsx`'s visuals or the tab list itself.
