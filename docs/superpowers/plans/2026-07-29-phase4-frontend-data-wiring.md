# Phase 4 Frontend Data Wiring (2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `BSW` mock with a real domain-input/polling flow against `websight-data`'s Crawls REST API (PR #4), rendering real data in Overview/Sitemap/Templates/APIs and the sidebar project list.

**Architecture:** A new `src/lib/crawls.js` API client and `src/lib/crawlMapper.js` pure data-transform layer sit between `App.jsx` (which now polls a real crawl to completion instead of running a fake timer) and the existing tab components (trimmed to only render fields real crawl data can honestly provide).

**Tech Stack:** React 19, Vitest + React Testing Library (existing), no new dependencies.

## Global Constraints

- Narrative-only mock fields (`industry`, `summary`, `tags`, `tech`, template `features`/`layers`, API `confidence`/`purpose`/`method`/`trigger`, project `score`) are **removed**, not stubbed with placeholder text — per the design spec's "simplify to what's real" decision.
- `src/components/XRayTab.jsx`, `src/lib/xrayContent.jsx`, `src/components/tabs/StackedPreview.jsx`, `src/components/tabs/ExportTab.jsx` are **not touched** in this plan.
- `MindMap.jsx`'s layout algorithm only positions two levels of nodes below the root (root → L1 → L1's children) — `buildSitemapNodes` must not emit nodes deeper than 2 path segments, or they'll silently fail to render (not a bug to "fix" later).
- Existing component tests are smoke-level (renders without crashing, key interactions fire) per `CLAUDE.md` — keep that bar for component tests; `crawlMapper.js`'s pure functions get real, thorough unit tests instead.
- `PALETTE` colors are assigned by array index, reusing `theme.js`'s existing `T.accent`/`T.violet`/`T.cyan`/`T.green`/`T.amber` tokens — there is no real "detected color" concept.

---

### Task 1: `src/lib/crawls.js` — API client

**Files:**
- Modify: `src/lib/auth.js` (export `apiFetch`)
- Create: `src/lib/crawls.js`
- Create: `src/lib/crawls.test.js`

**Interfaces:**
- Consumes: `apiFetch(path, options)` from `src/lib/auth.js` (existing, becomes exported).
- Produces: `createCrawl({domain, guestToken, clerkToken}) → Promise<{crawlId, remainingScans}>`, `getCrawl(id, {guestToken, clerkToken}) → Promise<crawl detail>`, `listCrawls({guestToken, clerkToken}) → Promise<{crawls: [...]}>` — consumed by Task 6's `App.jsx`.

- [ ] **Step 1: Export `apiFetch` from `auth.js`**

In `src/lib/auth.js`, change:

```js
async function apiFetch(path, options) {
```

to:

```js
export async function apiFetch(path, options) {
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/crawls.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCrawl, getCrawl, listCrawls } from "./crawls";

describe("createCrawl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends domain and guestToken in the body when no clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ crawlId: 1, remainingScans: 0 }) });
    const result = await createCrawl({ domain: "example.com", guestToken: "g1" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/crawls"),
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ domain: "example.com", guestToken: "g1" });
    expect(options.headers.Authorization).toBeUndefined();
    expect(result).toEqual({ crawlId: 1, remainingScans: 0 });
  });

  it("sends a bearer token and omits guestToken when clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ crawlId: 2, remainingScans: 4 }) });
    await createCrawl({ domain: "example.com", clerkToken: "jwt123" });
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt123");
    expect(JSON.parse(options.body)).toEqual({ domain: "example.com" });
  });

  it("throws ApiError(402) on quota exceeded", async () => {
    fetch.mockResolvedValue({ ok: false, status: 402, json: async () => ({ plan: "Guest", scanLimit: 1, used: 1 }) });
    await expect(createCrawl({ domain: "example.com", guestToken: "g1" })).rejects.toMatchObject({ status: 402 });
  });
});

describe("getCrawl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("GETs with a guestToken query param when no clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1, status: "queued" }) });
    await getCrawl(1, { guestToken: "g1" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/crawls/1?guestToken=g1"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("GETs with a bearer header and no query param when clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1, status: "done" }) });
    await getCrawl(1, { clerkToken: "jwt123" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain("guestToken");
    expect(options.headers.Authorization).toBe("Bearer jwt123");
  });
});

describe("listCrawls", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("GETs /api/crawls with a guestToken query param", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ crawls: [] }) });
    const result = await listCrawls({ guestToken: "g1" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/crawls?guestToken=g1"),
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual({ crawls: [] });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- src/lib/crawls.test.js`
Expected: FAIL — `./crawls` module doesn't exist yet.

- [ ] **Step 4: Implement**

Create `src/lib/crawls.js`:

```js
import { apiFetch } from "./auth";

export function createCrawl({ domain, guestToken, clerkToken }) {
  const headers = { "Content-Type": "application/json" };
  if (clerkToken) headers.Authorization = `Bearer ${clerkToken}`;
  return apiFetch("/api/crawls", {
    method: "POST",
    headers,
    body: JSON.stringify(clerkToken ? { domain } : { domain, guestToken }),
  });
}

export function getCrawl(id, { guestToken, clerkToken } = {}) {
  const headers = {};
  let path = `/api/crawls/${id}`;
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
  } else if (guestToken) {
    path += `?guestToken=${encodeURIComponent(guestToken)}`;
  }
  return apiFetch(path, { method: "GET", headers });
}

export function listCrawls({ guestToken, clerkToken } = {}) {
  const headers = {};
  let path = "/api/crawls";
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
  } else if (guestToken) {
    path += `?guestToken=${encodeURIComponent(guestToken)}`;
  }
  return apiFetch(path, { method: "GET", headers });
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- src/lib/crawls.test.js`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/lib/auth.js src/lib/crawls.js src/lib/crawls.test.js
git commit -m "feat: add Crawls API client"
```

---

### Task 2: `src/lib/crawlMapper.js` — real data transforms

**Files:**
- Create: `src/lib/crawlMapper.js`
- Create: `src/lib/crawlMapper.test.js`

**Interfaces:**
- Consumes: `T` from `src/lib/theme.js` (existing).
- Produces: `buildSitemapNodes(pages, domain) → nodes[]`, `mapMetrics(crawl) → metrics`, `mapTemplates(clusters, totalPages) → templates[]`, `mapIntegrations(integrations) → apis[]`, `mapProjects(crawlsListResponse) → projects[]` — all consumed by Task 6's `App.jsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/crawlMapper.test.js`:

```js
import { describe, it, expect } from "vitest";
import { buildSitemapNodes, mapMetrics, mapTemplates, mapIntegrations, mapProjects } from "./crawlMapper";

describe("buildSitemapNodes", () => {
  it("returns just the root node for a single-page site", () => {
    const nodes = buildSitemapNodes([{ path: "/" }], "example.com");
    expect(nodes).toEqual([{ id: "root", label: "example.com", parent: null, count: 1 }]);
  });

  it("groups pages under a first-level path segment", () => {
    const pages = [{ path: "/blog/a" }, { path: "/blog/b" }, { path: "/about" }];
    const nodes = buildSitemapNodes(pages, "example.com");
    expect(nodes.find((n) => n.id === "blog")).toMatchObject({ label: "blog", parent: "root", count: 2 });
    expect(nodes.find((n) => n.id === "about")).toMatchObject({ label: "about", parent: "root", count: 1 });
  });

  it("caps grouping at two path segments deep", () => {
    const pages = [{ path: "/blog/2026/07/a-post" }];
    const nodes = buildSitemapNodes(pages, "example.com");
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain("blog");
    expect(ids).toContain("blog/2026");
    expect(ids).not.toContain("blog/2026/07");
  });

  it("counts a second-level node only for pages under that exact prefix", () => {
    const pages = [{ path: "/blog/2026/a" }, { path: "/blog/2025/b" }];
    const nodes = buildSitemapNodes(pages, "example.com");
    expect(nodes.find((n) => n.id === "blog")).toMatchObject({ count: 2 });
    expect(nodes.find((n) => n.id === "blog/2026")).toMatchObject({ count: 1 });
    expect(nodes.find((n) => n.id === "blog/2025")).toMatchObject({ count: 1 });
  });
});

describe("mapMetrics", () => {
  it("counts pages, sections, templates, and apis", () => {
    const crawl = {
      domain: "example.com",
      pages: [{ path: "/" }, { path: "/blog/a" }],
      clusters: [{ urlPattern: "/blog/*", pageUrls: ["x"] }],
      integrations: [{ name: "Google Maps", category: "maps", matchedUrls: [] }],
      startedAt: "2026-07-29T00:00:00.000Z",
      finishedAt: "2026-07-29T00:00:03.200Z",
    };
    expect(mapMetrics(crawl)).toEqual({ pages: 2, sections: 1, templates: 1, apis: 1, crawlTime: "3.2s" });
  });

  it("formats sub-second and multi-minute durations", () => {
    const base = { domain: "x.com", pages: [], clusters: [], integrations: [] };
    expect(
      mapMetrics({ ...base, startedAt: "2026-01-01T00:00:00.000Z", finishedAt: "2026-01-01T00:00:00.500Z" }).crawlTime
    ).toBe("500ms");
    expect(
      mapMetrics({ ...base, startedAt: "2026-01-01T00:00:00.000Z", finishedAt: "2026-01-01T00:02:05.000Z" }).crawlTime
    ).toBe("2m 5s");
  });

  it("returns a placeholder when timestamps are missing", () => {
    const crawl = { domain: "x.com", pages: [], clusters: [], integrations: [], startedAt: null, finishedAt: null };
    expect(mapMetrics(crawl).crawlTime).toBe("—");
  });
});

describe("mapTemplates", () => {
  it("maps clusters to templates and wraps the color palette", () => {
    const clusters = Array.from({ length: 6 }, (_, i) => ({ urlPattern: `/p${i}/*`, pageUrls: ["a", "b"] }));
    const templates = mapTemplates(clusters, 100);
    expect(templates[0]).toMatchObject({ name: "/p0/*", pattern: "/p0/*", count: 2, total: 100 });
    expect(templates[0].color).toBe(templates[5].color);
  });
});

describe("mapIntegrations", () => {
  it("maps integrations to the apis shape", () => {
    const apis = mapIntegrations([{ name: "Google Maps", category: "maps", matchedUrls: ["https://maps.googleapis.com/x"] }]);
    expect(apis).toEqual([{ name: "Google Maps", type: "maps", color: apis[0].color, endpoints: ["https://maps.googleapis.com/x"] }]);
  });
});

describe("mapProjects", () => {
  it("maps a crawls list response to sidebar project rows", () => {
    const projects = mapProjects({
      crawls: [{ id: 1, domain: "example.com", status: "done", startedAt: "2026-07-29T14:00:00.000Z", finishedAt: "2026-07-29T14:00:03.000Z" }],
    });
    expect(projects).toEqual([{ id: 1, name: "example.com", status: "done", date: expect.any(String) }]);
  });

  it("returns an empty array for an empty crawls list", () => {
    expect(mapProjects({ crawls: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/crawlMapper.test.js`
Expected: FAIL — `./crawlMapper` module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/crawlMapper.js`:

```js
import { T } from "./theme";

const PALETTE = [T.accent, T.violet, T.cyan, T.green, T.amber];

export function buildSitemapNodes(pages, domain) {
  const root = { id: "root", label: domain, parent: null, count: pages.length };
  const nodes = new Map();

  for (const page of pages) {
    const segments = page.path.split("/").filter(Boolean).slice(0, 2);
    for (let depth = 1; depth <= segments.length; depth++) {
      const id = segments.slice(0, depth).join("/");
      const parent = depth === 1 ? "root" : segments.slice(0, depth - 1).join("/");
      const existing = nodes.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        nodes.set(id, { id, label: segments[depth - 1], parent, count: 1 });
      }
    }
  }

  return [root, ...nodes.values()];
}

function formatDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function mapMetrics(crawl) {
  const sections = buildSitemapNodes(crawl.pages, crawl.domain).filter((n) => n.parent === "root").length;
  return {
    pages: crawl.pages.length,
    sections,
    templates: crawl.clusters.length,
    apis: crawl.integrations.length,
    crawlTime: formatDuration(crawl.startedAt, crawl.finishedAt),
  };
}

export function mapTemplates(clusters, totalPages) {
  return clusters.map((c, i) => ({
    id: c.urlPattern || `cluster-${i}`,
    name: c.urlPattern,
    count: c.pageUrls.length,
    total: totalPages,
    pattern: c.urlPattern,
    color: PALETTE[i % PALETTE.length],
  }));
}

export function mapIntegrations(integrations) {
  return integrations.map((integration, i) => ({
    name: integration.name,
    type: integration.category,
    color: PALETTE[i % PALETTE.length],
    endpoints: integration.matchedUrls,
  }));
}

function formatDate(startedAt) {
  if (!startedAt) return "Queued";
  return new Date(startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function mapProjects(crawlsListResponse) {
  return (crawlsListResponse.crawls ?? []).map((c) => ({
    id: c.id,
    name: c.domain,
    status: c.status,
    date: formatDate(c.startedAt),
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/lib/crawlMapper.test.js`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/lib/crawlMapper.js src/lib/crawlMapper.test.js
git commit -m "feat: add real crawl-to-tab data mapping functions"
```

---

### Task 3: Trim `OverviewTab` and `APIsTab` to real fields

**Files:**
- Modify: `src/components/tabs/OverviewTab.jsx`
- Modify: `src/components/tabs/APIsTab.jsx`

**Interfaces:**
- Consumes: `data.domain`, `data.metrics` (from Task 2's `mapMetrics`) in `OverviewTab`; `data.apis` (from Task 2's `mapIntegrations`) in `APIsTab`.
- Produces: nothing consumed by later tasks — these are leaf presentational components.

No dedicated test files exist for these components today (only exercised via `App.test.jsx`, updated in Task 6) — this task is verified by lint + a manual read-through, matching this repo's existing coverage for these two files.

- [ ] **Step 1: Rewrite `OverviewTab.jsx`**

Replace the full file with:

```jsx
import { T, hex2rgb } from "../../lib/theme";

export function OverviewTab({data}){
  const metrics=[{l:"Total pages",v:data.metrics.pages.toLocaleString(),c:T.accent},{l:"Sitemap sections",v:data.metrics.sections,c:T.violet},{l:"Page templates",v:data.metrics.templates,c:T.cyan},{l:"APIs detected",v:data.metrics.apis,c:T.green},{l:"Crawl time",v:data.metrics.crawlTime,c:T.amber}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle,rgba(${hex2rgb(T.accent)},0.15),transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontSize:18,fontWeight:700,color:T.text0,fontFamily:T.sans,letterSpacing:"-.4px"}}>{data.domain}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>{metrics.map(m=>(
        <div key={m.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",bottom:-8,right:-8,width:40,height:40,borderRadius:"50%",background:`rgba(${hex2rgb(m.c)},0.1)`}}/>
          <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{m.l}</div>
          <div style={{fontSize:22,fontWeight:700,color:m.c,fontFamily:T.sans,letterSpacing:"-.5px"}}>{m.v}</div>
        </div>
      ))}</div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `APIsTab.jsx`**

Replace the full file with:

```jsx
import { useState } from "react";
import { T, hex2rgb } from "../../lib/theme";
import { Badge } from "../ui/Badge";

export function APIsTab({data}){
  const[sel,setSel]=useState(null);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {data.apis.map((a,i)=>{const open=sel===i;return(
        <div key={a.name} onClick={()=>setSel(open?null:i)} style={{background:open?`rgba(${hex2rgb(a.color)},0.08)`:T.card,border:open?`1px solid rgba(${hex2rgb(a.color)},0.4)`:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"all .15s"}}>
          <div style={{padding:"14px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:4,borderRadius:2,background:a.color,alignSelf:"stretch",flexShrink:0,minHeight:40}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:600,color:T.text0,fontFamily:T.sans}}>{a.name}</span>
                <Badge label={a.type} color={a.color} dim/>
              </div>
            </div>
            <span style={{color:T.text2,fontSize:14,flexShrink:0,marginTop:2,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>⌄</span>
          </div>
          {open&&<div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"12px 16px 14px",paddingLeft:34}}>
            <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:6}}>ENDPOINTS</div>
            {a.endpoints.map(e=><div key={e} style={{fontSize:12,color:T.cyan,fontFamily:T.mono,padding:"4px 10px",background:"rgba(34,211,238,0.05)",borderRadius:5,marginBottom:4,border:"1px solid rgba(34,211,238,0.1)"}}>{e}</div>)}
          </div>}
        </div>);
      })}
    </div>
  );
}
```

- [ ] **Step 3: Lint and commit**

Run: `npm run lint` — expect no errors (this also catches unused imports like the now-removed `Chip` import in `OverviewTab` and the removed confidence-color map in `APIsTab`).

```bash
git add src/components/tabs/OverviewTab.jsx src/components/tabs/APIsTab.jsx
git commit -m "feat: trim OverviewTab and APIsTab to real crawl fields"
```

---

### Task 4: Trim `TemplatesTab` and drop the fake `StackedPreview`

**Files:**
- Modify: `src/components/tabs/TemplatesTab.jsx`

**Interfaces:**
- Consumes: `data.templates` (from Task 2's `mapTemplates`).
- Produces: nothing consumed by later tasks.

`StackedPreview.jsx` itself is left unmodified and unused — sub-project 2b either revives it with real screenshot data or replaces it.

- [ ] **Step 1: Rewrite `TemplatesTab.jsx`**

Replace the full file with:

```jsx
import { useState } from "react";
import { T, hex2rgb, pct } from "../../lib/theme";

export function TemplatesTab({data}){
  const [sel, setSel] = useState(data.templates[0] ?? null);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:`rgba(${hex2rgb(T.accent)},0.06)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.6}}>
        Found <strong style={{color:T.text0}}>{data.templates.length} page templates</strong>. Click a template to see its URL pattern and page count.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
        {data.templates.map(t=>{const p=pct(t.count,t.total);const active=sel?.id===t.id;return(
          <div key={t.id} onClick={()=>setSel(active?null:t)}
            style={{background:active?`rgba(${hex2rgb(t.color)},0.1)`:T.card,border:active?`1.5px solid rgba(${hex2rgb(t.color)},0.5)`:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
            <div style={{width:8,height:8,borderRadius:2,background:t.color,marginBottom:8}}/>
            <div style={{fontSize:12,fontWeight:600,color:active?T.text0:T.text1,fontFamily:T.sans,marginBottom:3,lineHeight:1.3}}>{t.name}</div>
            <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{t.count.toLocaleString()} pages · {p}%</div>
            <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1}}><div style={{height:"100%",width:`${Math.min(100,p)}%`,background:t.color,borderRadius:1}}/></div>
          </div>);
        })}
      </div>
      {sel ? (
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
          <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:8}}>SELECTED TEMPLATE</div>
          <div style={{fontSize:13,color:T.text1,fontFamily:T.mono,marginBottom:4}}>{sel.pattern}</div>
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{sel.count.toLocaleString()} of {sel.total.toLocaleString()} pages</div>
        </div>
      ) : (
        <div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
          <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>Select a template to see details</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**

Run: `npm run lint` — expect no errors (catches the removed `StackedPreview` import).

```bash
git add src/components/tabs/TemplatesTab.jsx
git commit -m "feat: trim TemplatesTab to real cluster fields"
```

---

### Task 5: Real project list in `Sidebar`

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/Sidebar.test.jsx`

**Interfaces:**
- Consumes: `projects` prop now holds `{id, name, status, date}` rows (from Task 2's `mapProjects`) instead of mock `{id, name, status, date, score}`.
- Produces: `Sidebar` accepts a new `currentCrawlId` prop — consumed by Task 6's `App.jsx`.

- [ ] **Step 1: Write the failing test**

In `src/components/Sidebar.test.jsx`, replace the `projects` fixture (drop `score`) and add a new test. Full replacement:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const projects = [{ id: 1, name: "example.com", status: "done", date: "Jul 29, 2:00 PM" }];

describe("Sidebar", () => {
  it("renders all nav tabs and the project list", () => {
    render(<Sidebar tab="overview" setTab={() => {}} projects={projects} />);
    for (const label of ["Overview", "Sitemap", "Templates", "X-Ray", "APIs", "Export"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("calls setTab with the clicked tab's id", () => {
    const setTab = vi.fn();
    render(<Sidebar tab="overview" setTab={setTab} projects={projects} />);
    fireEvent.click(screen.getByText("Sitemap"));
    expect(setTab).toHaveBeenCalledWith("sitemap");
  });

  it("shows lock icons on the 4 restricted tabs when access is not paid", () => {
    render(
      <Sidebar tab="overview" setTab={() => {}} projects={projects} access={{ tier: "guest" }} />
    );
    for (const label of ["Templates", "X-Ray", "APIs", "Export"]) {
      expect(within(screen.getByText(label).closest("button")).getByText("🔒")).toBeInTheDocument();
    }
    for (const label of ["Overview", "Sitemap"]) {
      expect(within(screen.getByText(label).closest("button")).queryByText("🔒")).not.toBeInTheDocument();
    }
  });

  it("shows no lock icons when access.tier is paid", () => {
    render(<Sidebar tab="overview" setTab={() => {}} projects={projects} access={{ tier: "paid" }} />);
    expect(screen.queryByText("🔒")).not.toBeInTheDocument();
  });

  it("shows status labels for done, running, and queued projects", () => {
    const statuses = [
      { id: 1, name: "a.com", status: "done", date: "Jul 29" },
      { id: 2, name: "b.com", status: "running", date: "Jul 29" },
      { id: 3, name: "c.com", status: "queued", date: "Jul 29" },
    ];
    render(<Sidebar tab="overview" setTab={() => {}} projects={statuses} />);
    expect(screen.getByText("✓ Done")).toBeInTheDocument();
    expect(screen.getByText("… Running")).toBeInTheDocument();
    expect(screen.getByText("… Queued")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm test -- src/components/Sidebar.test.jsx`
Expected: FAIL on the new "shows status labels" test — `Sidebar` doesn't render "Running"/"Queued" labels yet (only "✓ Done"/"… Queued" via the old `p.status==="done"` ternary, and `score` no longer exists so the old score span silently renders nothing — verify by reading the current file, not by guessing).

- [ ] **Step 3: Rewrite the project list rendering in `Sidebar.jsx`**

Replace:

```jsx
export function Sidebar({tab,setTab,projects,access}){
```

with:

```jsx
export function Sidebar({tab,setTab,projects,access,currentCrawlId}){
```

Replace:

```jsx
        {projects.map(p=>(
          <div key={p.id} style={{padding:"7px 10px",borderRadius:8,marginBottom:2,background:p.name==="bswhealth.com"?T.accentDim:"transparent",border:p.name==="bswhealth.com"?`1px solid ${T.border}`:"1px solid transparent",cursor:"pointer"}}>
            <div style={{fontSize:12,color:p.name==="bswhealth.com"?T.text0:T.text1,fontFamily:T.mono,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
            <div style={{fontSize:10,color:T.text2,fontFamily:T.body,marginTop:2,display:"flex",justifyContent:"space-between"}}><span>{p.status==="done"?"✓ Done":"… Queued"}</span>{p.score&&<span style={{color:p.score>85?T.green:T.amber}}>{p.score}</span>}</div>
          </div>
        ))}
```

with:

```jsx
        {projects.map(p=>{
          const isCurrent=p.id===currentCrawlId;
          const statusLabel=p.status==="done"?"✓ Done":p.status==="failed"?"✕ Failed":p.status==="running"?"… Running":"… Queued";
          return(
          <div key={p.id} style={{padding:"7px 10px",borderRadius:8,marginBottom:2,background:isCurrent?T.accentDim:"transparent",border:isCurrent?`1px solid ${T.border}`:"1px solid transparent",cursor:"pointer"}}>
            <div style={{fontSize:12,color:isCurrent?T.text0:T.text1,fontFamily:T.mono,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
            <div style={{fontSize:10,color:T.text2,fontFamily:T.body,marginTop:2,display:"flex",justifyContent:"space-between"}}><span>{statusLabel}</span></div>
          </div>);
        })}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/components/Sidebar.test.jsx`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/Sidebar.jsx src/components/Sidebar.test.jsx
git commit -m "feat: render real project list in Sidebar"
```

---

### Task 6: Real domain-input/polling flow in `App.jsx`

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `createCrawl`/`getCrawl`/`listCrawls` (Task 1), `mapMetrics`/`buildSitemapNodes`/`mapTemplates`/`mapIntegrations`/`mapProjects` (Task 2), `Sidebar`'s `currentCrawlId` prop (Task 5).
- Produces: nothing consumed by later tasks — this is the last task in this plan.

This is the largest single change: `App.jsx`'s data source moves from the static `BSW` import to a real polled crawl. Read the current `src/App.jsx` and `src/App.test.jsx` in full before starting — this task replaces both files' content substantially rather than patching them incrementally.

- [ ] **Step 1: Rewrite `src/App.jsx`**

Replace the full file with:

```jsx
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { T } from "./lib/theme";
import { RESTRICTED_TABS } from "./lib/access";
import { getOrCreateGuestToken, fetchMe, ApiError } from "./lib/auth";
import { createCrawl, getCrawl, listCrawls } from "./lib/crawls";
import { mapMetrics, buildSitemapNodes, mapTemplates, mapIntegrations, mapProjects } from "./lib/crawlMapper";
import { Fonts } from "./components/Fonts";
import { HomePage } from "./components/HomePage";
import { Sidebar } from "./components/Sidebar";
import { XRayTab } from "./components/XRayTab";
import { UpsellNotice } from "./components/ui/UpsellNotice";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { SitemapTab } from "./components/tabs/SitemapTab";
import { TemplatesTab } from "./components/tabs/TemplatesTab";
import { APIsTab } from "./components/tabs/APIsTab";
import { ExportTab } from "./components/tabs/ExportTab";

const INITIAL_ACCESS = { tier: null, planName: "", scanLimit: 0, remainingScans: 0, loading: false, error: null };
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_FAILURES = 3;

export default function App(){
  const[view,setView]=useState("home");
  const[access,setAccess]=useState(INITIAL_ACCESS);
  const[analyzeError,setAnalyzeError]=useState(null);
  const[tab,setTab]=useState("overview");
  const[url,setUrl]=useState("");
  const[projects,setProjects]=useState([]);
  const[crawlId,setCrawlId]=useState(null);
  const[crawlStatus,setCrawlStatus]=useState(null);
  const[crawl,setCrawl]=useState(null);
  const[crawlError,setCrawlError]=useState(null);
  const{isSignedIn,getToken}=useAuth();

  async function resolveIdentity(){
    if(isSignedIn) return { clerkToken: await getToken() };
    return { guestToken: getOrCreateGuestToken() };
  }

  useEffect(()=>{
    if(!isSignedIn)return;
    let cancelled=false;
    (async()=>{
      setView("dashboard");
      setAccess(a=>({...a,loading:true,error:null}));
      try{
        const token=await getToken();
        const me=await fetchMe(token);
        if(cancelled)return;
        setAccess({tier:me.plan.tier,planName:me.plan.name,scanLimit:me.plan.scanLimit,remainingScans:me.remainingScans,loading:false,error:null});
      }catch{
        if(cancelled)return;
        setAccess(a=>({...a,loading:false,error:"Couldn't determine your access level — try refreshing"}));
      }
    })();
    return()=>{cancelled=true;};
  },[isSignedIn,getToken]);

  async function refreshProjects(){
    try{
      const identity=await resolveIdentity();
      const result=await listCrawls(identity);
      setProjects(mapProjects(result));
      return result;
    }catch{
      setProjects([]);
      return {crawls:[]};
    }
  }

  useEffect(()=>{
    if(view!=="dashboard")return;
    let cancelled=false;
    (async()=>{
      const result=await refreshProjects();
      if(cancelled)return;
      const[mostRecent]=result.crawls??[];
      if(mostRecent)setCrawlId(mostRecent.id);
    })();
    return()=>{cancelled=true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view]);

  useEffect(()=>{
    if(!crawlId)return;
    let cancelled=false;
    let failures=0;
    let timeoutId;

    async function poll(){
      if(cancelled)return;
      try{
        const identity=await resolveIdentity();
        const result=await getCrawl(crawlId,identity);
        if(cancelled)return;
        failures=0;
        setCrawlStatus(result.status);
        if(result.status==="done"){
          setCrawl(result);
          refreshProjects();
          return;
        }
        if(result.status==="failed"){
          setCrawlError(result.error||"The crawl failed.");
          refreshProjects();
          return;
        }
        timeoutId=setTimeout(poll,POLL_INTERVAL_MS);
      }catch{
        failures+=1;
        if(cancelled)return;
        if(failures>=MAX_POLL_FAILURES){
          setCrawlError("Lost connection while checking crawl status.");
          setCrawlStatus("failed");
          return;
        }
        timeoutId=setTimeout(poll,POLL_INTERVAL_MS);
      }
    }
    poll();
    return()=>{cancelled=true;clearTimeout(timeoutId);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[crawlId,isSignedIn,getToken]);

  function handleGuestAccess(nextAccess){
    setAccess(nextAccess);
    setView("dashboard");
  }

  function handleSetTab(nextTab){
    setAnalyzeError(null);
    setTab(nextTab);
  }

  async function handleAnalyzeClick(){
    setAnalyzeError(null);
    setCrawlError(null);
    try{
      const identity=await resolveIdentity();
      const result=await createCrawl({domain:url,...identity});
      setAccess(a=>({...a,remainingScans:result.remainingScans}));
      setCrawl(null);
      setCrawlStatus("queued");
      setCrawlId(result.crawlId);
    }catch(err){
      if(err instanceof ApiError&&err.status===402){
        setAccess(a=>({...a,remainingScans:0}));
        setAnalyzeError({kind:"quota",body:err.body});
      }else{
        setAnalyzeError({kind:"generic"});
      }
    }
  }

  const isPaid=access.tier==="paid";
  const isBusy=crawlStatus==="queued"||crawlStatus==="running";

  const tabContent=()=>{
    if(isBusy)return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:20}}>
        <div style={{width:36,height:36,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
        <div style={{fontSize:15,fontWeight:600,color:T.text0,fontFamily:T.sans}}>Analyzing website</div>
        <div style={{fontSize:13,color:T.text1,fontFamily:T.body}}>{crawlStatus==="queued"?"Waiting in queue…":`Crawling ${url}…`}</div>
      </div>);
    if(crawlStatus==="failed"){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
          <div style={{fontSize:13,color:T.text1,fontFamily:T.body}}>{crawlError||"Something went wrong crawling this site."}</div>
          <button onClick={handleAnalyzeClick} style={{padding:"7px 18px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text0,fontSize:13,fontFamily:T.sans,cursor:"pointer"}}>Retry</button>
        </div>
      );
    }
    if(analyzeError?.kind==="quota"){
      const hint=access.tier==="guest"?" Log in for more scans.":"";
      return<UpsellNotice title="Scan limit reached" message={`You've used all ${analyzeError.body.scanLimit} scans on the ${analyzeError.body.plan} plan.${hint}`}/>;
    }
    if(analyzeError?.kind==="generic"){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
          <div style={{fontSize:13,color:T.text1,fontFamily:T.body}}>Something went wrong starting that scan.</div>
          <button onClick={handleAnalyzeClick} style={{padding:"7px 18px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text0,fontSize:13,fontFamily:T.sans,cursor:"pointer"}}>Retry</button>
        </div>
      );
    }
    if(RESTRICTED_TABS.includes(tab)&&!isPaid){
      return<UpsellNotice title="Upgrade to unlock this tab" message="This tab is available on paid plans."/>;
    }
    if(crawlStatus!=="done"||!crawl){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:10}}>
          <div style={{fontSize:14,fontWeight:600,color:T.text0,fontFamily:T.sans}}>No analysis yet</div>
          <div style={{fontSize:13,color:T.text2,fontFamily:T.body}}>Enter a domain above and click Analyze to get started.</div>
        </div>
      );
    }
    const metrics=mapMetrics(crawl);
    const nodes=buildSitemapNodes(crawl.pages,crawl.domain);
    const templates=mapTemplates(crawl.clusters,crawl.pages.length);
    const apis=mapIntegrations(crawl.integrations);
    const data={domain:crawl.domain,metrics,nodes,templates,apis};
    switch(tab){
      case"overview": return<OverviewTab data={data}/>;
      case"sitemap": return<SitemapTab data={data}/>;
      case"templates": return<TemplatesTab data={data}/>;
      case"xray": return<XRayTab/>;
      case"apis": return<APIsTab data={data}/>;
      case"export": return<ExportTab/>;
      default: return<OverviewTab data={data}/>;
    }
  };

  if(view==="home"){
    return(<><Fonts/><HomePage onGuestAccess={handleGuestAccess}/></>);
  }

  return(
    <><Fonts/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:3px}`}</style>
      <div style={{display:"flex",flexDirection:"column",minHeight:620,background:T.bg0,color:T.text0,fontFamily:T.body}}>
        {access.error&&(
          <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"8px 20px",fontSize:12,color:T.amber,fontFamily:T.body}}>{access.error}</div>
        )}
        <div style={{display:"flex",flex:1}}>
          <Sidebar tab={tab} setTab={handleSetTab} projects={projects} access={access} currentCrawlId={crawlId}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{background:T.bg1,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:14,color:T.text2}}>🌐</span>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}/>
              <button onClick={handleAnalyzeClick} disabled={isBusy} style={{padding:"8px 22px",background:`linear-gradient(135deg,${T.accent},${T.violet})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontFamily:T.sans,fontWeight:600,cursor:isBusy?"default":"pointer",whiteSpace:"nowrap",letterSpacing:".2px",opacity:isBusy?0.6:1}}>Analyze ↗</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>{tabContent()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `src/App.test.jsx`**

Replace the full file with:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

let mockIsSignedIn = false;
const mockGetToken = vi.fn().mockResolvedValue("clerk-jwt-1");
const mockOpenSignIn = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isSignedIn: mockIsSignedIn, getToken: mockGetToken }),
  useClerk: () => ({ openSignIn: mockOpenSignIn }),
}));

vi.mock("./lib/auth", async () => {
  const actual = await vi.importActual("./lib/auth");
  return {
    ...actual,
    getOrCreateGuestToken: vi.fn(() => "guest-token-1"),
    fetchGuestInit: vi.fn(),
    fetchMe: vi.fn(),
  };
});

vi.mock("./lib/crawls", () => ({
  createCrawl: vi.fn(),
  getCrawl: vi.fn(),
  listCrawls: vi.fn(),
}));

import { fetchGuestInit, fetchMe, ApiError } from "./lib/auth";
import { createCrawl, getCrawl, listCrawls } from "./lib/crawls";

const DONE_CRAWL = {
  id: 1,
  domain: "example.com",
  status: "done",
  startedAt: "2026-07-29T00:00:00.000Z",
  finishedAt: "2026-07-29T00:00:03.000Z",
  error: null,
  pages: [{ url: "https://example.com/", path: "/", depth: 0, status: "ok" }],
  clusters: [{ urlPattern: "/", pageUrls: ["https://example.com/"] }],
  integrations: [{ name: "Google Maps", category: "maps", matchedUrls: ["https://maps.googleapis.com/x"] }],
};

async function continueAsGuest() {
  fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
  await vi.waitFor(() => screen.getByText(/enter a domain/i));
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsSignedIn = false;
    fetchGuestInit.mockReset().mockResolvedValue({ guestToken: "guest-token-1", remainingScans: 1 });
    fetchMe.mockReset();
    createCrawl.mockReset();
    getCrawl.mockReset();
    listCrawls.mockReset().mockResolvedValue({ crawls: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the home page before any login/guest choice", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });

  it("shows an empty state after guest access with no prior crawls", async () => {
    render(<App />);
    await continueAsGuest();
    expect(screen.getByText(/no analysis yet/i)).toBeInTheDocument();
  });

  it("auto-loads the most recent crawl on dashboard entry", async () => {
    listCrawls.mockResolvedValue({
      crawls: [{ id: 1, domain: "example.com", status: "done", startedAt: "2026-07-29T00:00:00.000Z", finishedAt: "2026-07-29T00:00:03.000Z" }],
    });
    getCrawl.mockResolvedValue(DONE_CRAWL);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
    await vi.waitFor(() => expect(screen.getByText("example.com")).toBeInTheDocument());
  });

  it("switches tabs", async () => {
    render(<App />);
    await continueAsGuest();
    fireEvent.click(screen.getByText("Sitemap"));
    expect(screen.getByRole("button", { name: /sitemap/i })).toBeInTheDocument();
  });

  it("locks Templates/X-Ray/APIs/Export for a guest and leaves Overview/Sitemap open", async () => {
    render(<App />);
    await continueAsGuest();

    fireEvent.click(screen.getByText("Templates"));
    expect(screen.getByText("Upgrade to unlock this tab")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Sitemap"));
    expect(screen.queryByText("Upgrade to unlock this tab")).not.toBeInTheDocument();
  });

  it("shows real APIs tab content for a paid user", async () => {
    mockIsSignedIn = true;
    fetchMe.mockResolvedValue({
      email: "a@b.com",
      role: "user",
      plan: { name: "Pro", tier: "paid", scanLimit: 50 },
      remainingScans: 50,
    });
    listCrawls.mockResolvedValue({ crawls: [{ id: 1, domain: "example.com", status: "done" }] });
    getCrawl.mockResolvedValue(DONE_CRAWL);
    render(<App />);
    await vi.waitFor(() => expect(screen.queryByText("🔒")).not.toBeInTheDocument());
    await vi.waitFor(() => expect(screen.getByText("example.com")).toBeInTheDocument());

    fireEvent.click(screen.getByText("APIs"));
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
  });

  it("runs a real analyze flow: creates a crawl, polls through running, and renders real data once done", async () => {
    createCrawl.mockResolvedValue({ crawlId: 42, remainingScans: 0 });
    getCrawl
      .mockResolvedValueOnce({ id: 42, domain: "example.com", status: "running", startedAt: null, finishedAt: null, error: null })
      .mockResolvedValueOnce(DONE_CRAWL);
    render(<App />);
    await continueAsGuest();

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "example.com" } });
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await vi.waitFor(() => expect(screen.getByText("Analyzing website")).toBeInTheDocument());
    expect(analyzeButton).toBeDisabled();

    await vi.advanceTimersByTimeAsync(2000);
    await vi.waitFor(() => expect(screen.getByText("example.com")).toBeInTheDocument());
    expect(screen.queryByText("Analyzing website")).not.toBeInTheDocument();
  });

  it("shows a quota-exceeded UpsellNotice when createCrawl rejects with 402", async () => {
    createCrawl.mockRejectedValue(new ApiError(402, { plan: "Guest", scanLimit: 1, used: 1 }));
    render(<App />);
    await continueAsGuest();

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await vi.waitFor(() => expect(screen.getByText("Scan limit reached")).toBeInTheDocument());
    expect(screen.getByText(/log in for more/i)).toBeInTheDocument();
  });

  it("shows the crawl's error message when the crawl fails", async () => {
    createCrawl.mockResolvedValue({ crawlId: 43, remainingScans: 0 });
    getCrawl.mockResolvedValue({ id: 43, domain: "example.com", status: "failed", error: "robots.txt disallowed all crawling" });
    render(<App />);
    await continueAsGuest();

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await vi.waitFor(() => expect(screen.getByText("robots.txt disallowed all crawling")).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every test in the rewritten `App.test.jsx` and the untouched `HomePage.test.jsx`/`Badge.test.jsx`/`Chip.test.jsx`/`UpsellNotice.test.jsx`.

- [ ] **Step 4: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: real domain-input and polling flow in App"
```

---

## Self-Review Notes

- **Spec coverage:** API client (Task 1), data mapping incl. `buildSitemapNodes` (Task 2), Overview/APIs/Templates trims (Tasks 3–4), Sidebar real projects (Task 5), App.jsx real flow + empty state + error handling (Task 6) — every component and behavior from the design spec has a task. X-Ray/StackedPreview/ExportTab correctly have no task (out of scope, confirmed in the spec).
- **Convention held:** component tests stay smoke-level per `CLAUDE.md`; only `crawlMapper.js` gets thorough unit tests, matching the spec's Testing section exactly.
- **Placeholder scan:** every step has literal file contents or literal commands.
- **Type/name consistency:** `{guestToken, clerkToken}` identity shape is identical across `crawls.js` (Task 1), `App.jsx`'s `resolveIdentity()` (Task 6), and matches the pattern `auth.js`'s existing `consumeScan`/`fetchMe` already use. `mapProjects`'s `{id, name, status, date}` shape (Task 2) matches exactly what `Sidebar.jsx` (Task 5) renders. `currentCrawlId` prop name is consistent between Task 5's `Sidebar.jsx` and Task 6's `App.jsx` usage.
