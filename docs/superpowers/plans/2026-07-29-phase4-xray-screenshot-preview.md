# Phase 4 Real Page Preview (2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace X-Ray's 100%-hardcoded demo content and Templates' placeholder with a real, shared page-preview component (screenshot + fetched HTML with a link fallback), built on sub-project 2a's already-merged data wiring.

**Architecture:** One new shared component, `PagePreview`, consumed by a rewritten `XRayTab` (page picker + preview) and an extended `TemplatesTab` (representative-page preview). `App.jsx` threads `crawl.pages` down to both. The two components it replaces (`xrayContent.jsx`, `StackedPreview.jsx`) are deleted as dead code.

**Tech Stack:** React 19, Vitest + React Testing Library (existing), no new dependencies.

## Global Constraints

- `PagePreview` never assumes `htmlUrl`/`screenshotUrl` are non-null — Phase 3's per-page upload error handling means either can legitimately be `null` for a real page.
- The HTML fetch attempts to show content inline but must degrade to a plain link on any failure (network error, non-OK response, or CORS block) — never leave the UI in a stuck "loading" or broken state.
- `xrayContent.jsx` and `StackedPreview.jsx` are deleted once nothing imports them (confirmed via grep before this plan was written — no other file references either).
- No new dependencies; reuse `theme.js`'s existing `T` tokens for all styling, matching every other component in this repo.

---

### Task 1: `mapTemplates` gains `pageUrls`

**Files:**
- Modify: `src/lib/crawlMapper.js`
- Modify: `src/lib/crawlMapper.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `mapTemplates(clusters, totalPages)` output now includes `pageUrls: string[]` per template — consumed by Task 4's `TemplatesTab.jsx`.

- [ ] **Step 1: Write the failing test**

In `src/lib/crawlMapper.test.js`, extend the existing `mapTemplates` test:

```js
describe("mapTemplates", () => {
  it("maps clusters to templates and wraps the color palette", () => {
    const clusters = Array.from({ length: 6 }, (_, i) => ({ urlPattern: `/p${i}/*`, pageUrls: ["a", "b"] }));
    const templates = mapTemplates(clusters, 100);
    expect(templates[0]).toMatchObject({ name: "/p0/*", pattern: "/p0/*", count: 2, total: 100, pageUrls: ["a", "b"] });
    expect(templates[0].color).toBe(templates[5].color);
  });
});
```

(This replaces the existing `toMatchObject` assertion, which doesn't check `pageUrls` yet — just add `pageUrls: ["a", "b"]` to the object being matched.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/crawlMapper.test.js`
Expected: FAIL — `pageUrls` is `undefined` in the actual output.

- [ ] **Step 3: Implement**

In `src/lib/crawlMapper.js`, change:

```js
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
```

to:

```js
export function mapTemplates(clusters, totalPages) {
  return clusters.map((c, i) => ({
    id: c.urlPattern || `cluster-${i}`,
    name: c.urlPattern,
    count: c.pageUrls.length,
    total: totalPages,
    pattern: c.urlPattern,
    pageUrls: c.pageUrls,
    color: PALETTE[i % PALETTE.length],
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
git commit -m "feat: include pageUrls in mapTemplates output"
```

---

### Task 2: `PagePreview` — the shared screenshot/HTML component

**Files:**
- Create: `src/components/PagePreview.jsx`
- Create: `src/components/PagePreview.test.jsx`

**Interfaces:**
- Consumes: `T`/`hex2rgb` from `src/lib/theme.js` (existing).
- Produces: `<PagePreview page={pageOrNull}/>` where `page` is `{path, screenshotUrl, htmlUrl}` (a subset of what PR #4's `GET /api/crawls/:id` returns per page) — consumed by Task 3's `XRayTab.jsx` and Task 4's `TemplatesTab.jsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/PagePreview.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PagePreview } from "./PagePreview";

describe("PagePreview", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a 'no preview available' state when there is no page", () => {
    render(<PagePreview page={null} />);
    expect(screen.getByText("No preview available")).toBeInTheDocument();
  });

  it("shows the screenshot and fetched HTML on success", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => "<html>hi</html>" });
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/a.png", htmlUrl: "https://r2.example/a.html" }} />);
    expect(screen.getByAltText("Screenshot of /a")).toHaveAttribute("src", "https://r2.example/a.png");
    expect(await screen.findByText("<html>hi</html>")).toBeInTheDocument();
  });

  it("falls back to a link when the HTML fetch fails", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/a.png", htmlUrl: "https://r2.example/a.html" }} />);
    const link = await screen.findByRole("link", { name: /view raw html/i });
    expect(link).toHaveAttribute("href", "https://r2.example/a.html");
  });

  it("falls back to a link when the fetch response is not ok", async () => {
    fetch.mockResolvedValue({ ok: false, status: 403 });
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/a.png", htmlUrl: "https://r2.example/a.html" }} />);
    expect(await screen.findByRole("link", { name: /view raw html/i })).toBeInTheDocument();
  });

  it("shows 'no screenshot available' when screenshotUrl is null", () => {
    render(<PagePreview page={{ path: "/a", screenshotUrl: null, htmlUrl: null }} />);
    expect(screen.getByText("No screenshot available")).toBeInTheDocument();
  });

  it("shows 'no HTML captured' and skips fetching when htmlUrl is null", () => {
    render(<PagePreview page={{ path: "/a", screenshotUrl: null, htmlUrl: null }} />);
    expect(screen.getByText("No HTML captured for this page.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/PagePreview.test.jsx`
Expected: FAIL — `./PagePreview` module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/components/PagePreview.jsx`:

```jsx
import { useState, useEffect } from "react";
import { T } from "../lib/theme";

export function PagePreview({ page }) {
  const [html, setHtml] = useState(null);
  const [htmlFailed, setHtmlFailed] = useState(false);

  useEffect(() => {
    setHtml(null);
    setHtmlFailed(false);
    if (!page?.htmlUrl) return;
    let cancelled = false;
    fetch(page.htmlUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        if (!cancelled) setHtmlFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page?.htmlUrl]);

  if (!page) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No preview available</span>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,overflow:"hidden"}}>
        <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
          <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>{page.path}</div>
        </div>
        {page.screenshotUrl ? (
          <img src={page.screenshotUrl} alt={`Screenshot of ${page.path}`} style={{width:"100%",display:"block"}}/>
        ) : (
          <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1}}>
            <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No screenshot available</span>
          </div>
        )}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px"}}>
        <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:8}}>HTML</div>
        {!page.htmlUrl && (
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>No HTML captured for this page.</div>
        )}
        {page.htmlUrl && html != null && (
          <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:240,overflowY:"auto",margin:0}}>{html}</pre>
        )}
        {page.htmlUrl && html == null && htmlFailed && (
          <a href={page.htmlUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.body}}>View raw HTML ↗</a>
        )}
        {page.htmlUrl && html == null && !htmlFailed && (
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>Loading…</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/components/PagePreview.test.jsx`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/PagePreview.jsx src/components/PagePreview.test.jsx
git commit -m "feat: add PagePreview component (real screenshot + HTML)"
```

---

### Task 3: Rewrite `XRayTab` around real pages

**Files:**
- Modify: `src/components/XRayTab.jsx`
- Delete: `src/lib/xrayContent.jsx`

**Interfaces:**
- Consumes: `PagePreview` (Task 2).
- Produces: `XRayTab` now takes a `pages` prop — consumed by Task 5's `App.jsx`.

No dedicated test file exists for `XRayTab` today (verified via lint + Vite transform, matching 2a's precedent for prop-driven tab components).

- [ ] **Step 1: Replace the full contents of `src/components/XRayTab.jsx`**

```jsx
import { useState } from "react";
import { T } from "../lib/theme";
import { PagePreview } from "./PagePreview";

export function XRayTab({ pages }) {
  const okPages = (pages ?? []).filter((p) => p.status === "ok");
  const [selectedUrl, setSelectedUrl] = useState(okPages[0]?.url ?? null);
  const selected = okPages.find((p) => p.url === selectedUrl) ?? null;

  if (okPages.length === 0) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No pages available to preview</span>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:12,color:T.text2,fontFamily:T.body}}>Page</span>
        <select value={selectedUrl} onChange={(e)=>setSelectedUrl(e.target.value)} style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}>
          {okPages.map((p)=>(<option key={p.url} value={p.url}>{p.path}</option>))}
        </select>
      </div>
      <PagePreview page={selected}/>
    </div>
  );
}
```

- [ ] **Step 2: Delete the now-unused fake content file**

```bash
git rm src/lib/xrayContent.jsx
```

- [ ] **Step 3: Lint**

Run: `npm run lint` — expect no errors (confirms nothing else imports the deleted file and no unused imports remain).

- [ ] **Step 4: Commit**

```bash
git add src/components/XRayTab.jsx
git commit -m "feat: rewrite XRayTab around real page screenshots"
```

(The deletion from Step 2 is already staged by `git rm`; this commit includes both changes.)

---

### Task 4: Real preview in `TemplatesTab`

**Files:**
- Modify: `src/components/tabs/TemplatesTab.jsx`
- Delete: `src/components/tabs/StackedPreview.jsx`

**Interfaces:**
- Consumes: `PagePreview` (Task 2), `pageUrls` on each template (Task 1).
- Produces: `TemplatesTab` now takes a `pages` prop alongside `data` — consumed by Task 5's `App.jsx`.

- [ ] **Step 1: Replace the full contents of `src/components/tabs/TemplatesTab.jsx`**

```jsx
import { useState } from "react";
import { T, hex2rgb, pct } from "../../lib/theme";
import { PagePreview } from "../PagePreview";

export function TemplatesTab({data, pages}){
  const [sel, setSel] = useState(data.templates[0] ?? null);
  const representativePage = sel ? (pages ?? []).find((p) => sel.pageUrls.includes(p.url)) ?? null : null;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:`rgba(${hex2rgb(T.accent)},0.06)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.6}}>
        Found <strong style={{color:T.text0}}>{data.templates.length} page templates</strong>. Click a template to see its URL pattern, page count, and a representative page.
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
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:8}}>SELECTED TEMPLATE</div>
            <div style={{fontSize:13,color:T.text1,fontFamily:T.mono,marginBottom:4}}>{sel.pattern}</div>
            <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{sel.count.toLocaleString()} of {sel.total.toLocaleString()} pages</div>
          </div>
          <PagePreview page={representativePage}/>
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

- [ ] **Step 2: Delete the now-unused mock-only component**

```bash
git rm src/components/tabs/StackedPreview.jsx
```

- [ ] **Step 3: Lint**

Run: `npm run lint` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tabs/TemplatesTab.jsx
git commit -m "feat: show a real representative page preview in TemplatesTab"
```

---

### Task 5: Thread `pages` through `App.jsx`

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `XRayTab`'s `pages` prop (Task 3), `TemplatesTab`'s `pages` prop (Task 4).
- Produces: nothing consumed by later tasks — this is the last task in this plan.

- [ ] **Step 1: Add `pages` to the `data` object and thread it to both tabs**

In `src/App.jsx`, inside `tabContent()`, change:

```jsx
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
```

to:

```jsx
    const metrics=mapMetrics(crawl);
    const nodes=buildSitemapNodes(crawl.pages,crawl.domain);
    const templates=mapTemplates(crawl.clusters,crawl.pages.length);
    const apis=mapIntegrations(crawl.integrations);
    const data={domain:crawl.domain,metrics,nodes,templates,apis,pages:crawl.pages};
    switch(tab){
      case"overview": return<OverviewTab data={data}/>;
      case"sitemap": return<SitemapTab data={data}/>;
      case"templates": return<TemplatesTab data={data} pages={data.pages}/>;
      case"xray": return<XRayTab pages={data.pages}/>;
      case"apis": return<APIsTab data={data}/>;
      case"export": return<ExportTab/>;
      default: return<OverviewTab data={data}/>;
    }
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass (`App.test.jsx` doesn't click into X-Ray or Templates in any of its current cases, so this change shouldn't affect any existing assertion — this run confirms that assumption holds) plus all new tests from Tasks 1–2.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/App.jsx
git commit -m "feat: pass real pages into XRayTab and TemplatesTab"
```

---

## Self-Review Notes

- **Spec coverage:** `PagePreview` (Task 2), `XRayTab` rewrite + `xrayContent.jsx` deletion (Task 3), `TemplatesTab` real preview + `StackedPreview.jsx` deletion (Task 4), `App.jsx` wiring (Task 5), `pageUrls` plumbing (Task 1) — every component and deletion from the design spec has a task. Out-of-scope items (R2 CORS config, page-picker pagination, `websight-data` changes) correctly have no task.
- **Placeholder scan:** every step has literal code or literal commands.
- **Type/name consistency:** `page.screenshotUrl`/`page.htmlUrl`/`page.path`/`page.url` (Task 2's `PagePreview` props) match exactly what `crawl.pages` already contains per PR #4's shape, unchanged by this plan. `sel.pageUrls` (Task 4) matches the field name added in Task 1's `mapTemplates`. `pages` prop name is identical across Task 3 (`XRayTab`), Task 4 (`TemplatesTab`), and Task 5 (`App.jsx`)'s usage of both.
