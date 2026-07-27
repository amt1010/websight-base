# WebSight

A dashboard for X-raying a website: its sitemap, its recurring page
templates, and every third-party API quietly hydrating those pages at load
time (booking widgets, maps, CRM data, whatever).

**Right now, none of that is real.** This repo is a UI shell. Open it up and
you're looking at one hardcoded object (`BSW` in `src/App.jsx`) pretending to
be a crawl of a healthcare site — 12,000 pages, five templates, four
third-party APIs, all made up. There is no crawler, no backend, no database.
It exists so the *idea* of the product — what a "website X-ray" should feel
like to look at — can be judged before a single line of scraping code gets
written. See `ROADMAP.md` for what turning this into a real product looks
like, in order.

## Quick start

```
npm install
npm run dev
```

That's it. Opens on `localhost:5173`. `npm run build` produces a static
`dist/` you can host anywhere — there's no server to run.

## What's actually here

- One big component (`src/App.jsx`) with a tab bar: Overview, Sitemap,
  Templates, X-Ray, APIs, Export.
- A design-token object (`T`) and two shared atoms (`Badge`, `Chip`) — no
  Tailwind, no component library, just inline styles.
- The X-Ray tab is the interesting part: it takes a page template and
  explodes it into layers (nav, hero, widget, footer, ...) and tags each
  layer with which API is actually filling it in. That's the core idea of
  the product, currently faked for one imaginary site.

## Why build the fake first

Scraping a site, clustering its pages into templates, and fingerprinting
which third-party scripts are doing what is genuinely hard — and easy to get
wrong in a way that's invisible until you look at the output. Building the
"what does the answer look like" screen first, with data you control, means
the crawler (when it exists) has a concrete target to hit instead of a vague
one. The mock is the spec.

## Status

Static frontend demo. No backend. See `ROADMAP.md` for the plan from here —
shipping this as-is, then the crawler, then the data layer, then wiring it
all together for real.
