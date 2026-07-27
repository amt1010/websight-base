# Roadmap: from static mock to live product

Right now WebSight is a UI shell around one hardcoded object (`BSW` in
`src/App.jsx`). Nothing is crawled, nothing is stored, nothing is real. This
is the phased plan to change that, in order.

## Phase 0 — Ship the demo (now)

Get the current build live so it's shareable, before touching architecture.

- Deploy to **Vercel**: framework preset auto-detects Vite, build command
  `npm run build`, output directory `dist`. No env vars needed yet.
- Connect the GitHub repo so every push to `main` auto-deploys a preview/prod
  build.

## Phase 1 — Frontend hardening ✅ done

- ✅ Split `App.jsx` into components under `src/components/` and data/logic
  under `src/lib/` (theme, mock data, X-ray layer content).
- ✅ Added Vitest + React Testing Library, with smoke tests for `App`,
  `Sidebar`, `Badge`, `Chip`.
- ✅ `.github/workflows/ci.yml` runs `npm run lint`, `npm run test`, and
  `npm run build` on every push/PR to `main`, as a merge gate.

Not done yet, left for whoever picks up more frontend work: no TypeScript,
no visual regression testing, and test coverage is smoke-level only (renders
without crashing, key interactions fire) rather than exhaustive.

## Phase 2 — Real crawler engine

Replace the hardcoded `BSW` object with an actual crawler.

- Headless-browser crawler (Playwright) that walks a given domain.
- DOM-based clustering to detect repeated page "templates" instead of
  hand-labeling them.
- Third-party script/API signature detection (the Phynd/Epic/Google Maps
  detection is currently just written by hand in `BSW` — this needs to
  become real static/dynamic analysis of network requests and injected
  scripts).

## Phase 3 — Data + jobs

A real crawl doesn't fit in a single request/response cycle.

- Postgres for crawl results (domains, pages, templates, detected APIs).
- Job queue (e.g. BullMQ + Redis) so crawls run async and the UI can poll
  status.
- Object storage (e.g. S3) for page screenshots / HTML snapshots powering
  the X-ray view.

## Phase 4 — Wire the frontend to the real backend

- REST or GraphQL API serving the Phase 3 data.
- Replace the `BSW` mock with fetched data, plus loading/error states.
- Add a real "enter a domain to crawl" flow instead of the fixed
  `bswhealth.com` demo.
- Optional: auth, so crawl reports can be saved per user.

## Phase 5 — Production hardening

- Secrets/config via Vercel env vars (or equivalent for the backend host).
- Error monitoring (e.g. Sentry) on both frontend and crawler.
- Crawler rate-limiting and `robots.txt` compliance — not optional once this
  crawls real third-party sites.
- Observability on crawl job success/failure rates.
- Custom domain + SSL.

Each phase should ship independently — Phase 0 makes the demo visible today;
everything after it is additive and doesn't block on the rest.
