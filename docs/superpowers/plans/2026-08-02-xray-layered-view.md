# X-Ray Tab Layered View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the X-Ray tab's plain screenshot+HTML preview with a `translucentweb.site`-style layered view — a dynamic toolbar of layers (Visual Render, Content/Text, HTML/DOM, CSS/Styles, Network/APIs, Data/Schema), scroll-wheel navigation between them, and an "exploded" offset-stack view — all derived client-side from the page's already-captured screenshot and HTML, with no new backend calls.

**Architecture:** A new pure module `src/lib/xrayLayers.js` (`deriveLayers(html)` + `LAYER_DEFS`) parses the raw HTML `PagePreview` already fetches into the four derivable layers. A new component `src/components/XRayLayers.jsx` consumes it, builds a toolbar from whichever layers have content for the current page (not a fixed six), and renders either one active layer (flat mode) or all available layers as an offset CSS-transform stack (exploded mode). `XRayTab.jsx` swaps `PagePreview` for `XRayLayers`. `TemplatesTab` and `PagePreview` itself are untouched.

**Tech Stack:** React 19, Vitest + React Testing Library (existing), no new dependencies.

Design doc: `docs/superpowers/specs/2026-08-02-xray-layered-view-design.md`

## Global Constraints

- No new backend calls, no new dependency — everything derives from `page.screenshotUrl`/`page.htmlUrl`, the same data `PagePreview` already consumes via the existing `useHtmlText` hook.
- `deriveLayers(html)` must never throw, including for `null`/empty/malformed HTML (e.g. malformed JSON-LD) — malformed input degrades to empty fields, not an exception.
- The layer toolbar is array-driven (`LAYER_DEFS.filter(...)`) — never hardcode "6" anywhere; a layer with no content for the current page is omitted from the toolbar entirely rather than shown empty.
- The Network/APIs layer always carries the caption "Resources referenced in this page's HTML — not a live network capture." — it must never be presented as a real request log.
- Reuse `theme.js`'s existing `T` tokens and the codebase's tight inline-style formatting (no spaces after `:`/`,` in style objects) for all new UI — matches every existing component.
- `src/components/PagePreview.jsx` and `src/components/tabs/TemplatesTab.jsx` are not modified by this plan.

---

### Task 1: `src/lib/xrayLayers.js` — `deriveLayers` + `LAYER_DEFS`

**Files:**
- Create: `src/lib/xrayLayers.js`
- Create: `src/lib/xrayLayers.test.js`

**Interfaces:**
- Consumes: nothing new (browser-global `DOMParser`).
- Produces: `deriveLayers(html) → { rawHtml, text, css: {inline, linked}, schema: {jsonLd, meta}, resources: [{url, type}] }` and `LAYER_DEFS: [{id, label, hasContent(derived)}]` in the fixed order `visual, text, html, css, network, schema` — both consumed by Task 2's `XRayLayers.jsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/xrayLayers.test.js`:

```js
import { describe, it, expect } from "vitest";
import { deriveLayers, LAYER_DEFS } from "./xrayLayers";

describe("deriveLayers", () => {
  it("returns empty layers for null html", () => {
    expect(deriveLayers(null)).toEqual({
      rawHtml: "",
      text: "",
      css: { inline: "", linked: [] },
      schema: { jsonLd: [], meta: [] },
      resources: [],
    });
  });

  it("extracts visible text and strips script/style content", () => {
    const html = "<html><body><style>.a{color:red}</style><script>var x=1;</script><h1>Hello</h1><p>World</p></body></html>";
    expect(deriveLayers(html).text).toBe("Hello World");
  });

  it("extracts inline and linked CSS", () => {
    const html = '<html><head><style>.a{color:red}</style><link rel="stylesheet" href="/a.css"></head><body></body></html>';
    const { css } = deriveLayers(html);
    expect(css.inline).toBe(".a{color:red}");
    expect(css.linked).toEqual(["/a.css"]);
  });

  it("extracts JSON-LD and skips malformed blocks", () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
      <script type="application/ld+json">not json</script>
    </head><body></body></html>`;
    expect(deriveLayers(html).schema.jsonLd).toEqual([{ "@type": "Organization", name: "Acme" }]);
  });

  it("extracts recognized meta tags only", () => {
    const html = `<html><head>
      <meta name="description" content="A test page">
      <meta property="og:title" content="Test">
      <meta name="viewport" content="width=device-width">
    </head><body></body></html>`;
    expect(deriveLayers(html).schema.meta).toEqual([
      { name: "description", content: "A test page" },
      { name: "og:title", content: "Test" },
    ]);
  });

  it("extracts and dedupes referenced resources by type", () => {
    const html = `<html><body>
      <script src="/a.js"></script>
      <script src="/a.js"></script>
      <img src="/b.png">
      <iframe src="https://embed.example/x"></iframe>
    </body></html>`;
    expect(deriveLayers(html).resources).toEqual([
      { url: "/a.js", type: "script" },
      { url: "/b.png", type: "image" },
      { url: "https://embed.example/x", type: "iframe" },
    ]);
  });
});

describe("LAYER_DEFS", () => {
  it("lists layers in Visual, Text, HTML, CSS, Network, Schema order", () => {
    expect(LAYER_DEFS.map((l) => l.id)).toEqual(["visual", "text", "html", "css", "network", "schema"]);
  });

  it("visual is always available; the rest depend on derived content", () => {
    const empty = deriveLayers(null);
    const availability = Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.hasContent(empty)]));
    expect(availability).toEqual({ visual: true, text: false, html: false, css: false, network: false, schema: false });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/xrayLayers.test.js`
Expected: FAIL — `./xrayLayers` module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/xrayLayers.js`:

```js
const META_PREFIXES = ["og:", "twitter:"];

function isRecognizedMetaName(name) {
  return name === "description" || META_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function deriveLayers(html) {
  const rawHtml = html ?? "";
  if (!rawHtml) {
    return {
      rawHtml: "",
      text: "",
      css: { inline: "", linked: [] },
      schema: { jsonLd: [], meta: [] },
      resources: [],
    };
  }

  const doc = new DOMParser().parseFromString(rawHtml, "text/html");

  const textDoc = doc.cloneNode(true);
  textDoc.querySelectorAll("script,style").forEach((el) => el.remove());
  const text = (textDoc.body?.textContent ?? "").replace(/\s+/g, " ").trim();

  const inline = Array.from(doc.querySelectorAll("style"))
    .map((el) => el.textContent)
    .join("\n\n")
    .trim();
  const linked = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]')).map((el) => el.getAttribute("href"));

  const jsonLd = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .map((el) => {
      try {
        return JSON.parse(el.textContent);
      } catch {
        return null;
      }
    })
    .filter((value) => value !== null);

  const meta = Array.from(doc.querySelectorAll("meta[name],meta[property]"))
    .map((el) => ({
      name: el.getAttribute("name") ?? el.getAttribute("property"),
      content: el.getAttribute("content") ?? "",
    }))
    .filter((m) => isRecognizedMetaName(m.name));

  const resourceEntries = [
    ...Array.from(doc.querySelectorAll("script[src]")).map((el) => ({ url: el.getAttribute("src"), type: "script" })),
    ...Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]')).map((el) => ({ url: el.getAttribute("href"), type: "stylesheet" })),
    ...Array.from(doc.querySelectorAll("img[src]")).map((el) => ({ url: el.getAttribute("src"), type: "image" })),
    ...Array.from(doc.querySelectorAll("iframe[src]")).map((el) => ({ url: el.getAttribute("src"), type: "iframe" })),
  ];
  const seen = new Set();
  const resources = resourceEntries.filter((r) => {
    const key = `${r.type}:${r.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { rawHtml, text, css: { inline, linked }, schema: { jsonLd, meta }, resources };
}

export const LAYER_DEFS = [
  { id: "visual", label: "Visual Render", hasContent: () => true },
  { id: "text", label: "Content / Text", hasContent: (d) => d.text.length > 0 },
  { id: "html", label: "HTML / DOM", hasContent: (d) => d.rawHtml.length > 0 },
  { id: "css", label: "CSS / Styles", hasContent: (d) => d.css.inline.length > 0 || d.css.linked.length > 0 },
  { id: "network", label: "Network / APIs", hasContent: (d) => d.resources.length > 0 },
  { id: "schema", label: "Data / Schema", hasContent: (d) => d.schema.jsonLd.length > 0 || d.schema.meta.length > 0 },
];
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/lib/xrayLayers.test.js`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/lib/xrayLayers.js src/lib/xrayLayers.test.js
git commit -m "feat: derive X-Ray layer content from captured page HTML"
```

---

### Task 2: `XRayLayers` — toolbar + flat single-layer view

**Files:**
- Create: `src/components/XRayLayers.jsx`
- Create: `src/components/XRayLayers.test.jsx`

**Interfaces:**
- Consumes: `deriveLayers`/`LAYER_DEFS` (Task 1), `useHtmlText` from `src/lib/useHtmlText.js` (existing, unchanged).
- Produces: `<XRayLayers page={pageOrNull}/>` where `page` is `{url, path, screenshotUrl, htmlUrl}` (same shape `PagePreview` takes) — consumed by Task 4's `XRayTab.jsx`. Renders a `data-testid="xray-layers-viewport"` root element, consumed by Task 3's wheel-navigation tests.

- [ ] **Step 1: Write the failing tests**

Create `src/components/XRayLayers.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { XRayLayers } from "./XRayLayers";

const HTML_WITH_ALL_LAYERS = `<html><head>
  <style>.a{color:red}</style>
  <link rel="stylesheet" href="/b.css">
  <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
  <meta name="description" content="A test page">
</head><body>
  <script src="/c.js"></script>
  <img src="/d.png">
  <h1>Hello</h1>
</body></html>`;

const PAGE = { path: "/a", url: "https://x/a", screenshotUrl: "https://x/a.png", htmlUrl: "https://x/a.html" };

describe("XRayLayers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows 'no preview available' when there is no page", () => {
    render(<XRayLayers page={null} />);
    expect(screen.getByText("No preview available")).toBeInTheDocument();
  });

  it("shows only the Visual Render toolbar entry before HTML loads", () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    expect(screen.getByRole("button", { name: "Visual Render" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CSS / Styles" })).not.toBeInTheDocument();
  });

  it("adds toolbar entries for every layer with content once HTML loads", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    expect(await screen.findByRole("button", { name: "CSS / Styles" })).toBeInTheDocument();
    ["Visual Render", "Content / Text", "HTML / DOM", "Network / APIs", "Data / Schema"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });

  it("switches the active panel when a toolbar button is clicked", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    fireEvent.click(await screen.findByRole("button", { name: "Content / Text" }));
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("collapses to just Visual Render when the HTML fetch fails", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<XRayLayers page={PAGE} />);
    await screen.findByAltText("Screenshot of /a");
    expect(screen.getByRole("button", { name: "Visual Render" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "HTML / DOM" })).not.toBeInTheDocument();
  });

  it("falls back to 'no preview available' when both screenshot and html are missing", () => {
    render(<XRayLayers page={{ path: "/a", url: "https://x/a", screenshotUrl: null, htmlUrl: null }} />);
    expect(screen.getByText("No preview available")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/XRayLayers.test.jsx`
Expected: FAIL — `./XRayLayers` module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/components/XRayLayers.jsx`:

```jsx
import { useState, useMemo } from "react";
import { T } from "../lib/theme";
import { useHtmlText } from "../lib/useHtmlText";
import { deriveLayers, LAYER_DEFS } from "../lib/xrayLayers";

function ScreenshotPanel({ page }) {
  const screenshotUrl = page?.screenshotUrl ?? null;
  const [imgState, setImgState] = useState({ url: screenshotUrl, failed: false });
  if (imgState.url !== screenshotUrl) {
    setImgState({ url: screenshotUrl, failed: false });
  }
  return (
    <div style={{border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,overflow:"hidden"}}>
      <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
        <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>{page.path}</div>
      </div>
      {screenshotUrl && !imgState.failed ? (
        <img src={screenshotUrl} alt={`Screenshot of ${page.path}`} onError={()=>setImgState((s)=>({...s,failed:true}))} style={{width:"100%",display:"block"}}/>
      ) : (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1}}>
          <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>{screenshotUrl ? "Screenshot unavailable" : "No screenshot available"}</span>
        </div>
      )}
    </div>
  );
}

function HtmlPanel({ page, html, htmlFailed }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px"}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:8}}>HTML / DOM</div>
      {!page.htmlUrl && (
        <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>No HTML captured for this page.</div>
      )}
      {page.htmlUrl && html != null && (
        <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:300,overflowY:"auto",margin:0}}>{html}</pre>
      )}
      {page.htmlUrl && html == null && htmlFailed && (
        <a href={page.htmlUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.body}}>View raw HTML ↗</a>
      )}
      {page.htmlUrl && html == null && !htmlFailed && (
        <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>Loading…</div>
      )}
    </div>
  );
}

function TextPanel({ derived }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px"}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:8}}>CONTENT / TEXT</div>
      <div style={{fontFamily:T.body,fontSize:12,lineHeight:1.6,color:T.text1,whiteSpace:"pre-wrap",maxHeight:300,overflowY:"auto"}}>{derived.text}</div>
    </div>
  );
}

function CssPanel({ derived }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600}}>CSS / STYLES</div>
      {derived.css.inline && (
        <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:220,overflowY:"auto",margin:0}}>{derived.css.inline}</pre>
      )}
      {derived.css.linked.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {derived.css.linked.map((href) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.mono,wordBreak:"break-all"}}>{href}</a>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourcesPanel({ derived }) {
  const groups = ["script", "stylesheet", "image", "iframe"]
    .map((type) => ({ type, items: derived.resources.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600}}>NETWORK / APIS</div>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.body,fontStyle:"italic"}}>Resources referenced in this page's HTML — not a live network capture.</div>
      {groups.map((g) => (
        <div key={g.type} style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:11,color:T.text1,fontFamily:T.sans,fontWeight:600,textTransform:"capitalize"}}>{g.type}</div>
          {g.items.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.mono,wordBreak:"break-all"}}>{r.url}</a>
          ))}
        </div>
      ))}
    </div>
  );
}

function SchemaPanel({ derived }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600}}>DATA / SCHEMA</div>
      {derived.schema.jsonLd.map((obj, i) => (
        <pre key={i} style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:220,overflowY:"auto",margin:0}}>{JSON.stringify(obj, null, 2)}</pre>
      ))}
      {derived.schema.meta.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {derived.schema.meta.map((m) => (
            <div key={m.name} style={{display:"flex",gap:8,fontSize:12,fontFamily:T.body}}>
              <span style={{color:T.text2,minWidth:110}}>{m.name}</span>
              <span style={{color:T.text1}}>{m.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PANEL_COMPONENTS = {
  visual: ScreenshotPanel,
  text: TextPanel,
  html: HtmlPanel,
  css: CssPanel,
  network: ResourcesPanel,
  schema: SchemaPanel,
};

export function XRayLayers({ page }) {
  const { html, failed: htmlFailed } = useHtmlText(page?.htmlUrl ?? null);
  const derived = useMemo(() => deriveLayers(html), [html]);
  const availableLayers = useMemo(() => LAYER_DEFS.filter((l) => l.hasContent(derived)), [derived]);
  const [activeLayerId, setActiveLayerId] = useState("visual");

  const hasAnyPreview = Boolean(page?.screenshotUrl) || Boolean(page?.htmlUrl);
  if (!page || !hasAnyPreview) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No preview available</span>
      </div>
    );
  }

  const activeIndex = Math.max(0, availableLayers.findIndex((l) => l.id === activeLayerId));
  const activeLayer = availableLayers[activeIndex] ?? availableLayers[0];
  const ActivePanel = PANEL_COMPONENTS[activeLayer.id];

  return (
    <div data-testid="xray-layers-viewport" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {availableLayers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayerId(layer.id)}
            style={{
              padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:T.sans,cursor:"pointer",
              border:`1px solid ${layer.id===activeLayer.id?T.accent:T.border}`,
              background:layer.id===activeLayer.id?T.accentDim:T.bg2,
              color:layer.id===activeLayer.id?T.text0:T.text1,
            }}
          >{layer.label}</button>
        ))}
      </div>
      <ActivePanel page={page} derived={derived} html={html} htmlFailed={htmlFailed}/>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/components/XRayLayers.test.jsx`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/XRayLayers.jsx src/components/XRayLayers.test.jsx
git commit -m "feat: add XRayLayers toolbar + flat layer view"
```

---

### Task 3: Exploded stack + scroll-wheel navigation

**Files:**
- Modify: `src/components/XRayLayers.jsx`
- Modify: `src/components/XRayLayers.test.jsx`

**Interfaces:**
- Consumes: everything from Task 2, unchanged.
- Produces: `<XRayLayers>` now also renders an "Explode"/"Collapse" toggle button and, per available layer, a `data-testid="xray-layer-<id>"` wrapper when exploded — not consumed elsewhere in this plan, but is the final shape `XRayTab` (Task 4) renders as-is.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/XRayLayers.test.jsx` (add the `within` import to the existing `@testing-library/react` import line, then add these `it` blocks inside the existing `describe("XRayLayers", ...)` block, after the last existing test):

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
```

```jsx
  it("wheel down moves to the next available layer", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    await screen.findByRole("button", { name: "Content / Text" });
    fireEvent.wheel(screen.getByTestId("xray-layers-viewport"), { deltaY: 100 });
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("wheel up does not move before the first layer", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    await screen.findByRole("button", { name: "Content / Text" });
    fireEvent.wheel(screen.getByTestId("xray-layers-viewport"), { deltaY: -100 });
    expect(screen.getByAltText("Screenshot of /a")).toBeInTheDocument();
  });

  it("explode toggle renders every available layer at once", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    await screen.findByRole("button", { name: "Content / Text" });
    fireEvent.click(screen.getByRole("button", { name: "Explode" }));
    expect(within(screen.getByTestId("xray-layer-visual")).getByAltText("Screenshot of /a")).toBeInTheDocument();
    expect(within(screen.getByTestId("xray-layer-text")).getByText("Hello")).toBeInTheDocument();
  });

  it("clicking a layer while exploded activates it and exits explode mode", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => HTML_WITH_ALL_LAYERS });
    render(<XRayLayers page={PAGE} />);
    await screen.findByRole("button", { name: "Content / Text" });
    fireEvent.click(screen.getByRole("button", { name: "Explode" }));
    fireEvent.click(screen.getByTestId("xray-layer-text"));
    expect(screen.getByRole("button", { name: "Explode" })).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/XRayLayers.test.jsx`
Expected: FAIL — no "Explode" button and no `xray-layer-*` test ids exist yet.

- [ ] **Step 3: Implement**

In `src/components/XRayLayers.jsx`, replace the `export function XRayLayers({ page }) { ... }` block (everything from that line to the end of the file) with:

```jsx
export function XRayLayers({ page }) {
  const { html, failed: htmlFailed } = useHtmlText(page?.htmlUrl ?? null);
  const derived = useMemo(() => deriveLayers(html), [html]);
  const availableLayers = useMemo(() => LAYER_DEFS.filter((l) => l.hasContent(derived)), [derived]);
  const [activeLayerId, setActiveLayerId] = useState("visual");
  const [exploded, setExploded] = useState(false);

  const hasAnyPreview = Boolean(page?.screenshotUrl) || Boolean(page?.htmlUrl);
  if (!page || !hasAnyPreview) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No preview available</span>
      </div>
    );
  }

  const activeIndex = Math.max(0, availableLayers.findIndex((l) => l.id === activeLayerId));
  const activeLayer = availableLayers[activeIndex] ?? availableLayers[0];
  const ActivePanel = PANEL_COMPONENTS[activeLayer.id];

  function selectLayer(id) {
    setActiveLayerId(id);
    setExploded(false);
  }

  function handleWheel(e) {
    const dir = e.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(availableLayers.length - 1, Math.max(0, activeIndex + dir));
    setActiveLayerId(availableLayers[nextIndex].id);
  }

  return (
    <div data-testid="xray-layers-viewport" onWheel={handleWheel} style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {availableLayers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => selectLayer(layer.id)}
            style={{
              padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:T.sans,cursor:"pointer",
              border:`1px solid ${layer.id===activeLayer.id?T.accent:T.border}`,
              background:layer.id===activeLayer.id?T.accentDim:T.bg2,
              color:layer.id===activeLayer.id?T.text0:T.text1,
            }}
          >{layer.label}</button>
        ))}
        <button
          onClick={() => setExploded((v) => !v)}
          style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:T.sans,cursor:"pointer",border:`1px solid ${T.border}`,background:T.bg2,color:T.text1}}
        >{exploded ? "Collapse" : "Explode"}</button>
      </div>
      {exploded ? (
        <div style={{position:"relative",height:340,perspective:1400}}>
          {availableLayers.map((layer, i) => {
            const Panel = PANEL_COMPONENTS[layer.id];
            const depth = availableLayers.length - 1 - i;
            return (
              <div
                key={layer.id}
                data-testid={`xray-layer-${layer.id}`}
                onClick={() => selectLayer(layer.id)}
                style={{
                  position:"absolute",inset:0,cursor:"pointer",
                  transform:`rotateX(6deg) rotateY(-10deg) translateZ(${-depth*40}px) translateX(${depth*24}px)`,
                  opacity:1-depth*0.12,
                  zIndex:availableLayers.length-depth,
                  transition:"transform .2s ease, opacity .2s ease",
                }}
              >
                <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,marginBottom:4}}>{layer.label}</div>
                <div style={{maxHeight:260,overflow:"hidden"}}><Panel page={page} derived={derived} html={html} htmlFailed={htmlFailed}/></div>
              </div>
            );
          })}
        </div>
      ) : (
        <ActivePanel page={page} derived={derived} html={html} htmlFailed={htmlFailed}/>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/components/XRayLayers.test.jsx`
Expected: PASS (all tests from Task 2 and Task 3).

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/XRayLayers.jsx src/components/XRayLayers.test.jsx
git commit -m "feat: add explode mode and scroll-wheel navigation to XRayLayers"
```

---

### Task 4: Wire `XRayLayers` into `XRayTab` and fix stale docs

**Files:**
- Modify: `src/components/XRayTab.jsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `XRayLayers` (Task 3).
- Produces: nothing consumed by later tasks — this is the last code task in this plan.

No dedicated test file exists for `XRayTab` today (per `CLAUDE.md`'s smoke-test bar for prop-driven tab components) — verified via lint + the existing `App.test.jsx`, which does not assert on `XRayTab` internals.

- [ ] **Step 1: Replace the full contents of `src/components/XRayTab.jsx`**

```jsx
import { useState } from "react";
import { T } from "../lib/theme";
import { XRayLayers } from "./XRayLayers";

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
      <XRayLayers key={selected?.url} page={selected}/>
    </div>
  );
}
```

(Only two lines actually change from the current file: the `PagePreview` import becomes `XRayLayers`, and `<PagePreview page={selected}/>` becomes `<XRayLayers key={selected?.url} page={selected}/>` — the `key` forces a fresh `activeLayerId`/`exploded` state whenever the selected page changes.)

- [ ] **Step 2: Fix the stale `xrayContent.jsx` reference in `CLAUDE.md`**

`CLAUDE.md`'s architecture list still references `src/lib/xrayContent.jsx`, a file that was already deleted in an earlier phase (confirmed via `git log`/`ls` — it doesn't exist in this repo). Replace:

```
- `src/lib/xrayContent.jsx` — the fake per-page-type visual/HTML/CSS/API/data
  layer content used by the X-Ray tab.
```

with:

```
- `src/lib/xrayLayers.js` — `deriveLayers(html)` + `LAYER_DEFS`: derives the
  X-Ray tab's Content/Text, CSS/Styles, Network/APIs, and Data/Schema layers
  client-side from a page's already-captured HTML (no new backend call).
```

Then replace:

```
- `src/components/` — `Sidebar`, `MindMap`, `XRayTab`, `Fonts`.
```

with:

```
- `src/components/` — `Sidebar`, `MindMap`, `XRayTab`, `XRayLayers` (the
  X-Ray tab's layer toolbar/exploded-stack view, built on `xrayLayers.js`),
  `Fonts`.
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass, plus every test from Tasks 1–3.

- [ ] **Step 4: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/XRayTab.jsx CLAUDE.md
git commit -m "feat: use XRayLayers in XRayTab; fix stale CLAUDE.md reference"
```

---

### Task 5: Manual verification in the browser

**Files:** none (verification only).

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: succeeds with no errors (catches any JSX/import mistake `lint`/`vitest`+jsdom might not).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (background) — the repo's `.env.local` already has `VITE_CLERK_PUBLISHABLE_KEY`/`VITE_API_BASE_URL` set, so guest mode can reach the real `websight-data` API.

- [ ] **Step 3: Load the dashboard and open X-Ray**

In a browser, open the dev server URL, continue as guest (or log in), and let the dashboard auto-load the most recently completed crawl if one already exists for this identity (per `App.jsx`'s existing "auto-load most recent crawl" behavior — reuse it rather than spending a fresh guest scan if a prior crawl is already available). Click the **X-Ray** tab.

- [ ] **Step 4: Verify the layered view against a real crawled page**

- Confirm the toolbar shows "Visual Render" plus whichever of Content/Text, HTML/DOM, CSS/Styles, Network/APIs, Data/Schema actually have content for the selected real page (not necessarily all six — that's expected, per the design).
- Click through each toolbar button and confirm its panel renders real content (not blank, not a crash).
- Hover the layer view and scroll the mouse wheel; confirm the active toolbar button advances/retreats one layer at a time and stops at both ends.
- Click "Explode"; confirm all available layers render as an offset stack. Click one of the offset panels; confirm it becomes the active flat-mode layer and the button relabels back to "Explode".
- Switch the page `<select>` to a different page; confirm the layer view resets to Visual Render (the `key`-forced remount from Task 4).

- [ ] **Step 5: Stop the dev server**

Report the outcome (pass, or describe what broke) before considering this plan complete.

---

## Self-Review Notes

- **Spec coverage:** `deriveLayers`/`LAYER_DEFS` (Task 1) covers all four derived layers from the spec's "Data derivation" section. `XRayLayers`'s toolbar + flat view (Task 2), explode mode + wheel navigation (Task 3), and the `XRayTab` wiring (Task 4) cover the full "UI / interaction" section, including the dynamic (non-fixed-six) layer list and the Network/APIs caveat caption. Error-handling behaviors (HTML fetch failure collapsing to Visual Render only, both-missing falling back to the shared empty state, malformed JSON-LD skipped) are each covered by a specific test in Task 2/Task 3. `PagePreview`/`TemplatesTab` are explicitly untouched, matching the spec's scope boundary. Manual browser verification (Task 5) matches `CLAUDE.md`'s UI-testing requirement and the spec's testing section.
- **Placeholder scan:** every step has literal code, literal test assertions, or literal commands — no "add error handling"-style steps.
- **Type/name consistency:** `deriveLayers(html)`'s return shape (`rawHtml, text, css:{inline,linked}, schema:{jsonLd,meta}, resources`) defined in Task 1 is used identically by every panel component in Task 2/3. `LAYER_DEFS`' `id` values (`visual,text,html,css,network,schema`) match the keys of `PANEL_COMPONENTS` in Task 2 exactly. `page` shape (`{url,path,screenshotUrl,htmlUrl}`) is identical to what `PagePreview` already takes and what `crawl.pages` already provides, unchanged by this plan. The `data-testid="xray-layers-viewport"` introduced in Task 2 and the `data-testid="xray-layer-<id>"` introduced in Task 3 are used consistently across both test files.
