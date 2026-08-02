# Issue #12 URL Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every dashboard section its own real, bookmarkable URL (`/overview`, `/sitemap`, `/templates`, `/x-ray`, `/apis`, `/export`) with working browser back/forward, using `react-router-dom`.

**Architecture:** `App.jsx`'s default export becomes a thin `<BrowserRouter>` wrapper around a new `AppShell` component (all of today's logic, minus `view`/`tab` local state). A new `DashboardRoute` component (matched by the `/:slug` route) resolves the slug to a tab id via `src/lib/routes.js` and renders exactly what today's dashboard branch renders. Navigation between tabs/pages becomes `navigate(...)` calls at the same three call sites that today call `setView(...)`.

**Tech Stack:** React 19, `react-router-dom` (new dependency), Vitest + React Testing Library (existing).

Design doc: `docs/superpowers/specs/2026-08-02-issue12-url-routing-design.md`

## Global Constraints

- No change to `Sidebar.jsx`'s prop contract — it keeps taking `tab`/`setTab`.
- No change to `main.jsx` — `BrowserRouter` lives inside `App.jsx` so `App.test.jsx` (which renders `<App/>` directly) needs no router setup of its own.
- Navigation is imperative (`navigate(...)` at specific call sites), never a continuously-re-evaluated redirect based on `isSignedIn`/`access` — see the design doc's race-condition reasoning. Do not "simplify" this into a declarative `<Navigate>` on the `/` route.
- Every existing `App.test.jsx` test must keep passing unmodified — this refactor is behavior-preserving for everything already covered.

---

### Task 1: `src/lib/routes.js` — slug/tab-id mapping

**Files:**
- Create: `src/lib/routes.js`
- Create: `src/lib/routes.test.js`
- Modify: `package.json`, `package-lock.json` (via `npm install`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `TAB_SLUGS: {overview,sitemap,templates,xray,apis,export} → slug`, `SLUG_TABS` (inverse), `DEFAULT_TAB = "overview"` — consumed by Task 2's `App.jsx`.

- [ ] **Step 1: Install the new dependency**

Run: `npm install react-router-dom`
Expected: adds `react-router-dom` to `dependencies` in `package.json` and updates `package-lock.json`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/routes.test.js`:

```js
import { describe, it, expect } from "vitest";
import { TAB_SLUGS, SLUG_TABS, DEFAULT_TAB } from "./routes";

describe("routes", () => {
  it("maps every tab id to a URL slug, with xray mapped to the readable x-ray", () => {
    expect(TAB_SLUGS).toEqual({
      overview: "overview",
      sitemap: "sitemap",
      templates: "templates",
      xray: "x-ray",
      apis: "apis",
      export: "export",
    });
  });

  it("SLUG_TABS is the exact inverse of TAB_SLUGS", () => {
    for (const [id, slug] of Object.entries(TAB_SLUGS)) {
      expect(SLUG_TABS[slug]).toBe(id);
    }
    expect(Object.keys(SLUG_TABS)).toHaveLength(Object.keys(TAB_SLUGS).length);
  });

  it("DEFAULT_TAB is a valid tab id", () => {
    expect(TAB_SLUGS).toHaveProperty(DEFAULT_TAB);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- src/lib/routes.test.js`
Expected: FAIL — `./routes` module doesn't exist yet.

- [ ] **Step 4: Implement**

Create `src/lib/routes.js`:

```js
export const TAB_SLUGS = {
  overview: "overview",
  sitemap: "sitemap",
  templates: "templates",
  xray: "x-ray",
  apis: "apis",
  export: "export",
};

export const SLUG_TABS = Object.fromEntries(Object.entries(TAB_SLUGS).map(([id, slug]) => [slug, id]));

export const DEFAULT_TAB = "overview";
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- src/lib/routes.test.js`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

Run: `npm run lint` — expect no errors.

```bash
git add package.json package-lock.json src/lib/routes.js src/lib/routes.test.js
git commit -m "feat: add react-router-dom and tab-slug route mapping"
```

---

### Task 2: Route `App.jsx` and add new routing tests

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `TAB_SLUGS`/`SLUG_TABS`/`DEFAULT_TAB` (Task 1).
- Produces: nothing consumed by later tasks — this is the last task in this plan.

- [ ] **Step 1: Add the new routing tests to `src/App.test.jsx`**

First, add a pathname reset to the existing `beforeEach` so this task's `pushState` calls don't leak into other tests. Change:

```js
  beforeEach(() => {
    vi.useFakeTimers();
```

to:

```js
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    vi.useFakeTimers();
```

Then add these three tests at the end of the `describe("App", ...)` block, after the last existing `it(...)`:

```js
  it("updates the URL when switching tabs", async () => {
    render(<App />);
    await continueAsGuest();
    fireEvent.click(screen.getByText("Sitemap"));
    expect(window.location.pathname).toBe("/sitemap");
  });

  it("redirects a dashboard URL to home when there is no active session", () => {
    window.history.pushState({}, "", "/templates");
    render(<App />);
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });

  it("stays on a deep-linked dashboard path for an already-signed-in user instead of bouncing to overview", async () => {
    mockIsSignedIn = true;
    fetchMe.mockResolvedValue({
      email: "a@b.com",
      role: "user",
      plan: { name: "Pro", tier: "paid", scanLimit: 50 },
      remainingScans: 50,
    });
    listCrawls.mockResolvedValue({ crawls: [] });
    window.history.pushState({}, "", "/apis");
    render(<App />);
    await vi.waitFor(() => screen.getByText("Log out"));
    expect(window.location.pathname).toBe("/apis");
  });
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npm test -- src/App.test.jsx`
Expected: the 3 new tests FAIL (no routing exists yet — `window.location.pathname` never changes, and a `pushState`-simulated deep link isn't understood by the unroute-d app, which always renders based on local `view`/`tab` state instead of the URL). All pre-existing tests should still PASS at this point (only new tests added so far, nothing in `App.jsx` changed yet).

- [ ] **Step 3: Replace the full contents of `src/App.jsx`**

```jsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { T } from "./lib/theme";
import { RESTRICTED_TABS } from "./lib/access";
import { TAB_SLUGS, SLUG_TABS, DEFAULT_TAB } from "./lib/routes";
import { getOrCreateGuestToken, clearGuestToken, fetchMe, ApiError } from "./lib/auth";
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
const GLOBAL_STYLE = `@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:3px}`;

function DashboardRoute({isSignedIn,access,tabContent,setTab,projects,crawlId,onLogout,url,setUrl,isBusy,handleAnalyzeClick}){
  const{slug}=useParams();
  const resolvedTab=SLUG_TABS[slug];
  if(!resolvedTab) return<Navigate to="/" replace/>;
  if(!isSignedIn&&!access.tier) return<Navigate to="/" replace/>;
  return(
    <><Fonts/>
      <style>{GLOBAL_STYLE}</style>
      <div style={{display:"flex",flexDirection:"column",minHeight:620,background:T.bg0,color:T.text0,fontFamily:T.body}}>
        {access.error&&(
          <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"8px 20px",fontSize:12,color:T.amber,fontFamily:T.body}}>{access.error}</div>
        )}
        <div style={{display:"flex",flex:1}}>
          <Sidebar tab={resolvedTab} setTab={setTab} projects={projects} access={access} currentCrawlId={crawlId} onLogout={onLogout}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{background:T.bg1,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:14,color:T.text2}}>🌐</span>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}/>
              <button onClick={handleAnalyzeClick} disabled={isBusy} style={{padding:"8px 22px",background:`linear-gradient(135deg,${T.accent},${T.violet})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontFamily:T.sans,fontWeight:600,cursor:isBusy?"default":"pointer",whiteSpace:"nowrap",letterSpacing:".2px",opacity:isBusy?0.6:1}}>Analyze ↗</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>{tabContent(resolvedTab)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function AppShell(){
  const[access,setAccess]=useState(INITIAL_ACCESS);
  const[analyzeError,setAnalyzeError]=useState(null);
  const[url,setUrl]=useState("");
  const[projects,setProjects]=useState([]);
  const[crawlId,setCrawlId]=useState(null);
  const[crawlStatus,setCrawlStatus]=useState(null);
  const[crawl,setCrawl]=useState(null);
  const[crawlError,setCrawlError]=useState(null);
  const{isSignedIn,getToken}=useAuth();
  const{signOut}=useClerk();
  const navigate=useNavigate();
  const location=useLocation();
  const isDashboard=location.pathname!=="/";

  async function resolveIdentity(){
    if(isSignedIn) return { clerkToken: await getToken() };
    return { guestToken: getOrCreateGuestToken() };
  }

  useEffect(()=>{
    if(!isSignedIn)return;
    if(location.pathname==="/") navigate(`/${TAB_SLUGS[DEFAULT_TAB]}`,{replace:true});
    let cancelled=false;
    (async()=>{
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if(!isDashboard)return;
    let cancelled=false;
    (async()=>{
      const result=await refreshProjects();
      if(cancelled)return;
      const[mostRecent]=result.crawls??[];
      if(mostRecent)setCrawlId(mostRecent.id);
    })();
    return()=>{cancelled=true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isDashboard]);

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
    navigate(`/${TAB_SLUGS[DEFAULT_TAB]}`);
  }

  async function handleLogout(){
    if(isSignedIn){
      await signOut?.();
    }else{
      clearGuestToken();
    }
    navigate("/");
    setAccess(INITIAL_ACCESS);
    setAnalyzeError(null);
    setUrl("");
    setProjects([]);
    setCrawlId(null);
    setCrawlStatus(null);
    setCrawl(null);
    setCrawlError(null);
  }

  function handleSetTab(nextTabId){
    setAnalyzeError(null);
    navigate(`/${TAB_SLUGS[nextTabId]}`);
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

  const tabContent=(tab)=>{
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
  };

  return(
    <Routes>
      <Route path="/" element={<><Fonts/><HomePage onGuestAccess={handleGuestAccess}/></>}/>
      <Route path="/:slug" element={
        <DashboardRoute
          isSignedIn={isSignedIn}
          access={access}
          tabContent={tabContent}
          setTab={handleSetTab}
          projects={projects}
          crawlId={crawlId}
          onLogout={handleLogout}
          url={url}
          setUrl={setUrl}
          isBusy={isBusy}
          handleAnalyzeClick={handleAnalyzeClick}
        />
      }/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App(){
  return(
    <BrowserRouter>
      <AppShell/>
    </BrowserRouter>
  );
}
```

Note: `case"export": return<ExportTab/>;` is deliberately left exactly as it is today (no `data` prop) — threading `data` into `ExportTab` is issue #19's job, a separate plan, to keep this plan's diff scoped to routing only.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: ALL tests pass — every pre-existing `App.test.jsx` test (unmodified, per the Global Constraints) plus the 3 new tests from Step 1, plus everything from Task 1.

- [ ] **Step 5: Lint and build**

Run: `npm run lint` — expect no errors.
Run: `npm run build` — expect a clean production build (catches any issue the jsdom test environment might not, e.g. `react-router-dom`'s ESM/CJS interop with Vite).

- [ ] **Step 6: Update `CLAUDE.md`**

Add `react-router-dom` to the Stack section. Find:

```
- Plain CSS + inline style objects. No Tailwind, no CSS-in-JS library.
- npm (`package-lock.json` is committed)
```

Replace with:

```
- `react-router-dom` for client-side routing — each dashboard section is a
  real URL (`/overview`, `/sitemap`, `/templates`, `/x-ray`, `/apis`,
  `/export`); `src/lib/routes.js` holds the tab-id ↔ URL-slug mapping.
- Plain CSS + inline style objects. No Tailwind, no CSS-in-JS library.
- npm (`package-lock.json` is committed)
```

Also update the architecture bullet listing `src/App.jsx`'s responsibilities. Find:

```
- `src/App.jsx` — the root component: `view` (home/dashboard) and `access`
  (tier/quota) state, resolving access from either guest-mode or a Clerk
  login, tab switching and gating, the fake analyze/loading sequence, and
  composing the pieces above.
```

Replace with:

```
- `src/App.jsx` — `App` mounts `BrowserRouter` around `AppShell`, which
  holds `access` (tier/quota) state, resolving access from either
  guest-mode or a Clerk login, real analyze/crawl-polling state, and
  composing the pieces above. `DashboardRoute` (in the same file) resolves
  the `/:slug` URL param to a tab id via `src/lib/routes.js` and renders
  the gated tab content; navigation is real browser URL navigation, not
  local `tab` state.
```

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/App.test.jsx CLAUDE.md
git commit -m "feat: give every dashboard section a real URL via react-router-dom"
```

---

## Self-Review Notes

- **Spec coverage:** the slug table (Task 1) and every architectural piece from the design doc — `BrowserRouter`/`AppShell` split, imperative-only navigation at the 3 original `setView` call sites, the `/` deep-link guard, the `isDashboard`-boolean-not-raw-pathname fix for the refresh-projects effect, `Sidebar` left untouched — are all in Task 2's single `App.jsx` replacement. The known accepted limitation (no continuous re-redirect from `/`) is preserved by construction (no such logic was added). Out-of-scope items (crawl-id in URL, `Sidebar` changes) correctly have no task.
- **Placeholder scan:** every step has literal code or literal commands; no "add appropriate handling" language.
- **Type/name consistency:** `tabContent` changes from a no-arg closure to `tabContent(tab)`, and every call site (`DashboardRoute`'s `tabContent(resolvedTab)`) matches. `SLUG_TABS`/`TAB_SLUGS`/`DEFAULT_TAB` names and shapes from Task 1 are used identically in Task 2. `handleSetTab` keeps its existing name and its existing responsibility (clear `analyzeError`) while changing its second action from `setTab(...)` to `navigate(...)`.
