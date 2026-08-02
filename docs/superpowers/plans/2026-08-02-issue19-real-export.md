# Issue #19 Real Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ExportTab`'s four decorative, non-functional export cards + fake share link with three genuinely working exports (PDF via print, real CSV, real JSON), removing the two options (Figma kit, Share & Collaborate) that aren't realistically buildable without new infrastructure.

**Architecture:** A new pure-ish module `src/lib/exportData.js` builds CSV/report-HTML content (pure, unit-tested) and wraps the browser download/print-window side effects. `ExportTab.jsx` gains a `data` prop (same object every other tab already receives) and wires each remaining card's `onClick` to one of these helpers.

**Tech Stack:** React 19, Vitest + React Testing Library (existing), no new dependencies.

Design doc: `docs/superpowers/specs/2026-08-02-issue19-real-export-design.md`

## Global Constraints

- No new dependency — PDF export uses the browser's native print-to-PDF via a new-tab printable document, not a PDF library.
- No backend/API changes — everything is derived from the `data` object already computed in `App.jsx`.
- Figma sitemap kit and "Share & Collaborate" are removed from the UI entirely, not left as relabeled mocks — matches this project's established "remove what can't be made real" precedent.
- Reuse `theme.js`'s existing `T` tokens and this repo's tight inline-style formatting for any UI changes.

---

### Task 1: `src/lib/exportData.js` — CSV, report HTML, and download/print helpers

**Files:**
- Create: `src/lib/exportData.js`
- Create: `src/lib/exportData.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildCsv(pages) → string`, `buildReportHtml(data) → string`, `downloadFile(filename, content, mimeType)`, `openPrintableReport(data)` — all consumed by Task 2's `ExportTab.jsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/exportData.test.js`:

```js
import { describe, it, expect } from "vitest";
import { buildCsv, buildReportHtml } from "./exportData";

describe("buildCsv", () => {
  it("returns just the header row for an empty pages list", () => {
    expect(buildCsv([])).toBe("url,path,depth,status");
  });

  it("renders one row per page", () => {
    const pages = [{ url: "https://x.com/", path: "/", depth: 0, status: "ok" }];
    expect(buildCsv(pages)).toBe("url,path,depth,status\nhttps://x.com/,/,0,ok");
  });

  it("quotes fields containing a comma", () => {
    const pages = [{ url: "https://x.com/?a=1,2", path: "/", depth: 0, status: "ok" }];
    expect(buildCsv(pages)).toBe('url,path,depth,status\n"https://x.com/?a=1,2",/,0,ok');
  });

  it("doubles internal quotes when a field contains a quote", () => {
    const pages = [{ url: "https://x.com/", path: '/say"hi"', depth: 0, status: "ok" }];
    expect(buildCsv(pages)).toBe('url,path,depth,status\nhttps://x.com/,"/say""hi""",0,ok');
  });
});

describe("buildReportHtml", () => {
  const data = {
    domain: "example.com",
    metrics: { pages: 10, sections: 2, templates: 3, apis: 1, crawlTime: "1.2s" },
    templates: [{ name: "Blog Post", pattern: "/blog/*", count: 5 }],
    apis: [{ name: "Google Maps", type: "maps", endpoints: ["https://maps.googleapis.com/x"] }],
  };

  it("includes the domain, metric values, template names, and API names", () => {
    const html = buildReportHtml(data);
    expect(html).toContain("example.com");
    expect(html).toContain("1.2s");
    expect(html).toContain("Blog Post");
    expect(html).toContain("Google Maps");
  });

  it("renders a friendly message when there are no templates or APIs", () => {
    const html = buildReportHtml({ ...data, templates: [], apis: [] });
    expect(html).toContain("No templates detected.");
    expect(html).toContain("No third-party APIs detected.");
  });

  it("escapes HTML-significant characters in the domain", () => {
    const html = buildReportHtml({ ...data, domain: "<script>evil</script>" });
    expect(html).not.toContain("<script>evil</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/exportData.test.js`
Expected: FAIL — `./exportData` module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/exportData.js`:

```js
function csvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(pages) {
  const header = ["url", "path", "depth", "status"];
  const rows = (pages ?? []).map((p) => [p.url, p.path, p.depth, p.status]);
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\n");
}

function escapeHtml(value) {
  const str = String(value ?? "");
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function buildReportHtml(data) {
  const metricsRows = [
    ["Total pages", data.metrics.pages],
    ["Sitemap sections", data.metrics.sections],
    ["Page templates", data.metrics.templates],
    ["APIs detected", data.metrics.apis],
    ["Crawl time", data.metrics.crawlTime],
  ]
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  const templateRows = (data.templates ?? [])
    .map((t) => `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.pattern)}</td><td>${escapeHtml(t.count)}</td></tr>`)
    .join("");

  const apiRows = (data.apis ?? [])
    .map((a) => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.type)}</td><td>${escapeHtml((a.endpoints ?? []).join(", "))}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(data.domain)} — Discovery Report</title>
<style>
body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:32px;}
h1{font-size:22px;margin-bottom:4px;}
h2{font-size:15px;margin-top:28px;border-bottom:1px solid #ccc;padding-bottom:4px;}
table{width:100%;border-collapse:collapse;margin-top:8px;}
td{padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;}
</style>
</head>
<body>
<h1>${escapeHtml(data.domain)}</h1>
<h2>Metrics</h2>
<table>${metricsRows}</table>
<h2>Page templates</h2>
<table>${templateRows || "<tr><td>No templates detected.</td></tr>"}</table>
<h2>Detected APIs</h2>
<table>${apiRows || "<tr><td>No third-party APIs detected.</td></tr>"}</table>
</body>
</html>`;
}

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openPrintableReport(data) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildReportHtml(data));
  win.document.close();
  win.focus();
  win.print();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/lib/exportData.test.js`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/lib/exportData.js src/lib/exportData.test.js
git commit -m "feat: add CSV/report-HTML builders and download/print helpers"
```

---

### Task 2: Wire real exports into `ExportTab`

**Files:**
- Modify: `src/components/tabs/ExportTab.jsx`
- Create: `src/components/tabs/ExportTab.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `buildCsv`/`downloadFile`/`openPrintableReport` (Task 1).
- Produces: `<ExportTab data={data}/>` — `data` is the same object (`{domain, metrics, nodes, templates, apis, pages}`) every other tab already receives from `App.jsx`'s `tabContent`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/tabs/ExportTab.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportTab } from "./ExportTab";

const DATA = {
  domain: "example.com",
  metrics: { pages: 10, sections: 2, templates: 3, apis: 1, crawlTime: "1.2s" },
  templates: [{ name: "Blog Post", pattern: "/blog/*", count: 5 }],
  apis: [{ name: "Google Maps", type: "maps", endpoints: ["https://maps.googleapis.com/x"] }],
  pages: [{ url: "https://example.com/", path: "/", depth: 0, status: "ok" }],
};

describe("ExportTab", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render the Figma export or the Share & Collaborate block", () => {
    render(<ExportTab data={DATA} />);
    expect(screen.queryByText(/figma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/share & collaborate/i)).not.toBeInTheDocument();
  });

  it("downloads a CSV of the pages when the CSV card is clicked", () => {
    render(<ExportTab data={DATA} />);
    fireEvent.click(screen.getByText("CSV — URL inventory"));
    expect(URL.createObjectURL).toHaveBeenCalled();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/csv");
  });

  it("downloads the raw JSON analysis when the JSON card is clicked", () => {
    render(<ExportTab data={DATA} />);
    fireEvent.click(screen.getByText("JSON — raw analysis"));
    expect(URL.createObjectURL).toHaveBeenCalled();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/json");
  });

  it("opens a printable report and calls print() when the PDF card is clicked", () => {
    const printSpy = vi.fn();
    const writeSpy = vi.fn();
    const mockWindow = { document: { write: writeSpy, close: vi.fn() }, focus: vi.fn(), print: printSpy };
    vi.spyOn(window, "open").mockReturnValue(mockWindow);
    render(<ExportTab data={DATA} />);
    fireEvent.click(screen.getByText("PDF Discovery Report"));
    expect(writeSpy).toHaveBeenCalled();
    expect(writeSpy.mock.calls[0][0]).toContain("example.com");
    expect(printSpy).toHaveBeenCalled();
  });

  it("does nothing (no crash) when window.open is blocked and returns null", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<ExportTab data={DATA} />);
    expect(() => fireEvent.click(screen.getByText("PDF Discovery Report"))).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/tabs/ExportTab.test.jsx`
Expected: FAIL — `ExportTab` doesn't take a `data` prop yet, has no click handlers, and still renders the Figma card and Share block.

- [ ] **Step 3: Replace the full contents of `src/components/tabs/ExportTab.jsx`**

```jsx
import { T, hex2rgb } from "../../lib/theme";
import { Badge } from "../ui/Badge";
import { buildCsv, downloadFile, openPrintableReport } from "../../lib/exportData";

export function ExportTab({data}){
  const exports=[
    {icon:"⬇",label:"PDF Discovery Report",desc:"Metrics, page templates, and detected APIs, formatted for print/PDF",badge:"PDF",color:T.accent,onClick:()=>openPrintableReport(data)},
    {icon:"⬇",label:"CSV — URL inventory",desc:"Every crawled page's URL, path, depth, and status",badge:"CSV",color:T.cyan,onClick:()=>downloadFile(`${data.domain}-urls.csv`,buildCsv(data.pages),"text/csv")},
    {icon:"⬇",label:"JSON — raw analysis",desc:"Machine-readable output for downstream tools",badge:"JSON",color:T.violet,onClick:()=>downloadFile(`${data.domain}-analysis.json`,JSON.stringify(data,null,2),"application/json")},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {exports.map(e=>(
        <div key={e.label} onClick={e.onClick} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onMouseEnter={ev=>ev.currentTarget.style.borderColor=`rgba(${hex2rgb(e.color)},0.4)`} onMouseLeave={ev=>ev.currentTarget.style.borderColor=T.border}>
          <div style={{width:36,height:36,borderRadius:9,background:`rgba(${hex2rgb(e.color)},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text0,fontFamily:T.sans,marginBottom:2}}>{e.label}</div><div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{e.desc}</div></div>
          <Badge label={e.badge} color={e.color}/>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Wire `data` through `App.jsx`**

In `src/App.jsx`'s `tabContent` function, change:

```jsx
      case"export": return<ExportTab/>;
```

to:

```jsx
      case"export": return<ExportTab data={data}/>;
```

(If issue #12's routing plan has already landed, this line lives inside the same `tabContent(tab)` function in `AppShell` — the change is identical either way, since that plan explicitly left this line untouched.)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `ExportTab.test.jsx` and everything from Task 1.

- [ ] **Step 6: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/tabs/ExportTab.jsx src/components/tabs/ExportTab.test.jsx src/App.jsx
git commit -m "feat: make Export tab's PDF/CSV/JSON options real; remove Figma and Share"
```

---

### Task 3: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 2: Manual browser check**

Start the dev server (`npm run dev`), reach the Export tab with a completed crawl loaded, and confirm: clicking CSV downloads a `.csv` file with real page rows; clicking JSON downloads a `.json` file with the real analysis object; clicking PDF opens a new tab with a readable report and triggers the print dialog; the Figma card and Share & Collaborate box are gone.

---

## Self-Review Notes

- **Spec coverage:** `buildCsv`/`buildReportHtml`/`downloadFile`/`openPrintableReport` (Task 1) and the `ExportTab` rewrite + `data` threading (Task 2) cover every piece of the design doc's Architecture and Components sections. The "remove Figma/Share" decision is directly verified by Task 2's first test. Out-of-scope items (backend share persistence, a real Figma export, embedded screenshots in the PDF) correctly have no task.
- **Placeholder scan:** every step has literal code, literal test assertions, or literal commands.
- **Type/name consistency:** `buildCsv(pages)`, `buildReportHtml(data)`, `downloadFile(filename, content, mimeType)`, `openPrintableReport(data)` — names and signatures from Task 1 are used identically in Task 2's `ExportTab.jsx`. `data` prop shape matches exactly what every other tab already receives from `App.jsx`'s `tabContent`, unchanged by this plan.
