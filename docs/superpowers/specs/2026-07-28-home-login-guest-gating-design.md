# Home Page / Login / Guest Mode / Tab Gating — Frontend (Sub-project 2): Design

Status: approved
Date: 2026-07-28
Repo: websight-base (extends the existing frontend, no new repo)

## Context

This is the second of three sub-projects implementing the Auth/Guest/Paid
Gating feature (see `websight-data`'s
`docs/superpowers/specs/2026-07-28-auth-subscriptions-api-design.md` for
sub-project 1, the backend this depends on). This sub-project adds the
user-facing pieces: a new home page, Clerk login, a guest mode, and gating
of the existing 6 dashboard tabs by tier.

Locked decisions carried over from the overall feature brainstorm:

- Keep the existing 6 tabs (Overview, Sitemap, Templates, X-Ray, APIs,
  Export) exactly as they render today — new screens must match their
  visual polish, not redesign them.
- Auth is real (Clerk), not simulated.
- Scans continue to render the existing hardcoded `BSW` mock — wiring real
  crawl data is the separate, already-planned Phase 4 work and is
  explicitly out of scope here.
- Three tiers: **Guest** (1 scan, Overview+Sitemap only, no account),
  **Free** login (a few more scans, still Overview+Sitemap only), **Paid**
  (full tab access, quota per admin-set plan).
- No self-service payment/upgrade flow — plan assignment is admin-only
  (sub-project 3).

Sub-project 1 already built and deployed (as Vercel serverless functions in
`websight-data`): `POST /api/scans/guest-init`, `POST /api/scans/consume`,
`GET /api/me`, plus the admin routes sub-project 3 will use. This
sub-project is the first consumer of that API.

## Approach: no router, prop-passed access state

`App.jsx` gains a top-level `view` state (`'home' | 'dashboard'`), following
the same pattern as the existing `tab` state switch — no routing library is
added; this app has zero routes today and two top-level screens don't
justify one. Access/tier information is resolved once into a single
`access` state object in `App.jsx` and passed down as a prop to `Sidebar`
and the tab-rendering logic, matching the existing `data`-prop-passing
convention rather than introducing React Context (unused anywhere in this
codebase today).

## Components

```
websight-base/
  src/
    lib/
      auth.js               (new) getOrCreateGuestToken, fetchGuestInit,
                             fetchMe, consumeScan — plain, mockable functions
    components/
      HomePage.jsx           (new) landing screen: hero + "Log in" /
                             "Continue as Guest"
      Sidebar.jsx            (modified) accepts `access` prop, renders a
                             lock icon on restricted nav items
      ui/
        UpsellNotice.jsx     (new) shared "locked" / "quota exceeded"
                             message box, reused by both cases
    App.jsx                  (modified) `view` state, `access` state,
                             Analyze button wired to consumeScan, tab
                             content gated by access.tier
  src/main.jsx                (modified) wraps <App/> in Clerk's
                             <ClerkProvider>
  .env.example                (new) VITE_CLERK_PUBLISHABLE_KEY,
                             VITE_API_BASE_URL
  package.json                 (modified) adds @clerk/clerk-react
```

### `src/lib/auth.js`

```js
export function getOrCreateGuestToken() { /* localStorage read/create, try/catch fallback to in-memory */ }
export async function fetchGuestInit(guestToken) { /* POST {API_BASE}/api/scans/guest-init */ }
export async function fetchMe(clerkToken) { /* GET {API_BASE}/api/me */ }
export async function consumeScan({ guestToken, clerkToken }) { /* POST {API_BASE}/api/scans/consume */ }
```

`API_BASE` reads `import.meta.env.VITE_API_BASE_URL` — the separately
deployed `websight-data` Vercel project's URL.

### `access` shape (held in `App.jsx` state)

```js
{
  tier: 'guest' | 'free' | 'paid',
  planName: string,
  scanLimit: number,
  remainingScans: number,
  loading: boolean,
  error: string | null,
}
```

Guest's `access` is synthesized locally from `fetchGuestInit`'s response
(`tier: 'guest'`, `planName: 'Guest'`, `scanLimit: 1` — these three are
hardcoded client-side constants mirroring the backend's own hardcoded
`GUEST_SCAN_LIMIT`, since guest never has a `plans` row). Free/Paid's
`access` comes directly from `fetchMe`'s `{email, role, plan, remainingScans}`
response, with `tier` taken from `plan.tier`.

## Request / data flow

1. App loads → `view: 'home'` → `HomePage` renders.
2. **Guest path**: click "Continue as Guest" → `getOrCreateGuestToken()` →
   `fetchGuestInit(token)` → `access` populated with `tier: 'guest'` →
   `view: 'dashboard'`.
3. **Login path**: click "Log in" → Clerk's `useClerk().openSignIn()` hosted
   modal → on success, Clerk's `useAuth().isSignedIn` flips true → an effect
   calls `fetchMe(await getToken())` → `access` populated with `tier`
   from the response's `plan.tier` → `view: 'dashboard'`.
4. **Dashboard, tab gating**: `Sidebar` shows a lock icon on
   Templates/X-Ray/APIs/Export when `access.tier !== 'paid'` (still
   clickable). `App.jsx`'s `tabContent()` renders `UpsellNotice` instead of
   the real tab component for those four tabs under the same condition.
   Overview and Sitemap always render normally.
5. **Analyze click**: calls `consumeScan({ guestToken } | { clerkToken })`.
   - 200 → update `access.remainingScans` from the response, proceed with
     today's existing fake 6-step loading animation and `BSW` mock render,
     unchanged.
   - 402 → skip the loading animation; render `UpsellNotice` with the
     response's `{plan, scanLimit, used}` (guest wording adds "log in for
     more"; logged-in free wording doesn't, since they're already logged
     in). No CTA button — informational only, per the no-self-service
     decision.
   - other error → generic inline retry banner, Analyze re-enabled.

## Error handling

- `getOrCreateGuestToken()`: `localStorage` calls wrapped in try/catch —
  falls back to an in-memory-only token for the session if storage throws
  (privacy mode, disabled storage), rather than crashing. Guest mode still
  works; quota just won't persist across a refresh in that case.
- Clerk's own SDK owns error UI for its hosted `openSignIn()` modal — no
  custom handling layered on top.
- `fetchMe`/`fetchGuestInit` network failure: `access.error` set,
  `access.loading` false, `App.jsx` shows an inline banner ("Couldn't
  determine your access level — try refreshing"). Tier is treated as
  unknown and **fails closed** — all four restricted tabs stay locked, so a
  transient API outage never accidentally grants paid-tier access.
- `consumeScan` 401 (expired Clerk session mid-use): treated as a generic
  error (inline banner) — no silent re-auth attempt; a genuinely expired
  session needs a refresh, which re-enters the flow from `HomePage`.

## Testing

- `src/lib/auth.test.js` (new): `getOrCreateGuestToken` (creates once,
  reuses on second call, falls back gracefully when `localStorage.setItem`
  throws); `fetchGuestInit`/`fetchMe`/`consumeScan` against a mocked
  `global.fetch` (`vi.fn()` — no MSW, consistent with this repo's existing
  lightweight test style).
- `HomePage.test.jsx` (new): renders hero + both buttons; "Continue as
  Guest" calls the mocked `fetchGuestInit` and transitions off the home
  view. Clerk is mocked via `vi.mock('@clerk/clerk-react', ...)` so tests
  need no real Clerk keys or network access.
- `Sidebar.test.jsx` (extend existing file): lock icons render for
  restricted tabs when `access.tier` is `'guest'`/`'free'`; absent when
  `'paid'`.
- `App.test.jsx` (extend existing file): guest end-to-end — home →
  "Continue as Guest" → dashboard shows Overview/Sitemap normally and a
  locked `UpsellNotice` for Templates → Analyze consumes the mocked single
  scan → a second Analyze click shows the quota-exceeded `UpsellNotice`
  instead of the loading animation. All existing tests (BSW rendering, tab
  switching, the fake-loading-sequence timing test) must keep passing
  unchanged, now reachable only after the home screen — regression guard
  that today's behavior survives the new gate in front of it.
- No visual regression testing added, consistent with this repo's existing
  "smoke-level" testing note in `CLAUDE.md`.

## Out of scope for this sub-project (confirmed)

- Real crawl data, or anything from Phase 4 — Analyze continues to render
  the mock `BSW` object regardless of tier.
- Self-service payment/upgrade flow — informational messaging only.
- Admin rate-card config UI — sub-project 3.
- React Router / real URL routes — explicitly rejected in favor of
  state-based view switching, matching this app's existing conventions.
- Persisting guest identity across devices/browsers — `guestToken` is
  `localStorage`-only, per sub-project 1's accepted "guest abuse
  resistance" limitation.
