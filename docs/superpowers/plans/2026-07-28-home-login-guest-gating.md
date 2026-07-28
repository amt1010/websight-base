# Home Page / Login / Guest Mode / Tab Gating (Sub-project 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a home page with Clerk login + guest mode to `websight-base`, and gate the 4 advanced dashboard tabs (Templates, X-Ray, APIs, Export) behind paid-tier access, consuming the already-deployed `websight-data` auth/quota API.

**Architecture:** No router — `App.jsx` gains a `view` state (`'home' | 'dashboard'`) alongside its existing `tab` state, following the same switch-on-state pattern already used for tabs. Access/tier info is resolved once into a single `access` object held in `App.jsx` state and passed down as a prop (no Context). `src/lib/auth.js` holds plain, mockable functions for talking to the `websight-data` API; no component calls `fetch` directly.

**Tech Stack:** React 19 + Vite 8 (existing), `@clerk/clerk-react` (new dependency), Vitest + React Testing Library (existing).

**Spec:** `docs/superpowers/specs/2026-07-28-home-login-guest-gating-design.md`

## Global Constraints

- No React Router / new URL routes — state-based view switching only (`view: 'home' | 'dashboard'`).
- No React Context — `access` is resolved once in `App.jsx` and passed down as a prop, matching the existing `data`-prop convention.
- Keep the existing 6 tabs' rendering and visual polish exactly as today — gating wraps them, it doesn't redesign them. Overview and Sitemap always render normally regardless of tier.
- Auth is real Clerk (`@clerk/clerk-react`), not simulated.
- No self-service payment/upgrade UI anywhere added by this plan — quota/lock messaging is informational only, no CTA button.
- Guest identity is `localStorage`-only (`getOrCreateGuestToken`) — no cross-device persistence, accepted limitation.
- Styling: inline `style={{...}}` objects + the `T` token object from `src/lib/theme.js` — no Tailwind, no CSS-in-JS, no new styling system.
- Scans still render the existing hardcoded `BSW` mock (`src/lib/mockData.js`) regardless of tier — no real crawl data in this plan.
- **Confirmed with user (2026-07-28):** `Sidebar.jsx`'s existing hardcoded footer ("Starter plan" / "3/10 analyses used" + "Upgrade ↗" button) is explicitly **out of scope** for this plan — leave it untouched even though it shows unrelated mock data next to the new real gating UI. Do not remove, wire up, or otherwise touch it.
- No visual regression testing (consistent with this repo's existing smoke-level testing note in `CLAUDE.md`).
- `websight-data`'s real API response shapes (verified against `api/me.ts`, `api/scans/guest-init.ts`, `api/scans/consume.ts`):
  - `POST /api/scans/guest-init` body `{guestToken}` → `{guestToken, remainingScans}`.
  - `GET /api/me` (header `Authorization: Bearer <jwt>`) → `{email, role, plan:{name,tier,scanLimit}, remainingScans}`.
  - `POST /api/scans/consume` body `{guestToken}` or bearer JWT with `{}` body → `{remainingScans}` on success, or a non-2xx response with JSON body on error (`402` body is `{plan, scanLimit, used}`).

---

## File Structure

```
websight-base/
  .env.example                       (new)      VITE_CLERK_PUBLISHABLE_KEY, VITE_API_BASE_URL
  package.json                       (modified) adds @clerk/clerk-react
  CLAUDE.md                          (modified) documents the new API/auth integration
  src/
    main.jsx                        (modified) wraps <App/> in <ClerkProvider>
    App.jsx                         (modified) view/access state, guest+login wiring, tab gating
    App.test.jsx                    (modified) extended for the new home gate + gating
    lib/
      auth.js                       (new)      getOrCreateGuestToken, fetchGuestInit, fetchMe,
                                                consumeScan, ApiError, GUEST_SCAN_LIMIT
      auth.test.js                  (new)
      access.js                     (new)      RESTRICTED_TABS — shared between Sidebar and App
    components/
      HomePage.jsx                  (new)      hero + "Log in" / "Continue as Guest"
      HomePage.test.jsx             (new)
      Sidebar.jsx                   (modified) accepts `access` prop, renders lock icons
      Sidebar.test.jsx              (modified)
      ui/
        UpsellNotice.jsx            (new)      shared locked/quota message box
        UpsellNotice.test.jsx       (new)
```

`src/lib/access.js` is a small addition beyond the spec's file list: `RESTRICTED_TABS` (the 4 gated tab ids) is needed by both `Sidebar.jsx` (lock icons) and `App.jsx` (tab-content gating), so it's hoisted to one shared constant instead of being duplicated/drifting between the two files.

---

### Task 1: Clerk provider wiring

**Files:**
- Modify: `package.json`
- Modify: `src/main.jsx`
- Create: `.env.example`

**Interfaces:**
- Produces: `@clerk/clerk-react`'s `ClerkProvider`, `useAuth`, `useClerk` hooks become available to every component under `<App/>` (used starting Task 4).

- [ ] **Step 1: Install the dependency**

Run: `npm install @clerk/clerk-react`

- [ ] **Step 2: Create `.env.example`**

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_BASE_URL=https://websight-data.vercel.app
```

- [ ] **Step 3: Wrap `App` in `ClerkProvider`**

Edit `src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Verify the app still builds and lints**

Run: `npm run lint && npm run build`
Expected: both succeed (Clerk only throws about a missing key at runtime inside `ClerkProvider`, not at build time).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/main.jsx .env.example
git commit -m "Wrap App in ClerkProvider, add Clerk dependency"
```

---

### Task 2: `src/lib/auth.js` — API client functions

**Files:**
- Create: `src/lib/auth.js`
- Test: `src/lib/auth.test.js`

**Interfaces:**
- Produces:
  - `getOrCreateGuestToken(): string`
  - `GUEST_SCAN_LIMIT: number` (= `1`)
  - `class ApiError extends Error { status: number; body: object|null }`
  - `fetchGuestInit(guestToken: string): Promise<{guestToken: string, remainingScans: number}>`
  - `fetchMe(clerkToken: string): Promise<{email, role, plan:{name,tier,scanLimit}, remainingScans}>`
  - `consumeScan({guestToken?: string, clerkToken?: string}): Promise<{remainingScans: number}>`
- Consumes: nothing (leaf module, only depends on the global `fetch`/`localStorage`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrCreateGuestToken,
  fetchGuestInit,
  fetchMe,
  consumeScan,
  ApiError,
  GUEST_SCAN_LIMIT,
} from "./auth";

describe("GUEST_SCAN_LIMIT", () => {
  it("is 1, mirroring the backend's hardcoded guest limit", () => {
    expect(GUEST_SCAN_LIMIT).toBe(1);
  });
});

describe("getOrCreateGuestToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a token on first call and persists it to localStorage", () => {
    const token = getOrCreateGuestToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(localStorage.getItem("websight_guest_token")).toBe(token);
  });

  it("reuses the same token on a second call", () => {
    const first = getOrCreateGuestToken();
    const second = getOrCreateGuestToken();
    expect(second).toBe(first);
  });

  it("falls back to an in-memory token when localStorage throws", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const token = getOrCreateGuestToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    spy.mockRestore();
  });
});

describe("fetchGuestInit", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("POSTs to /api/scans/guest-init with the token and returns the parsed body", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ guestToken: "abc", remainingScans: 1 }),
    });

    const result = await fetchGuestInit("abc");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/scans/guest-init"),
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ guestToken: "abc" });
    expect(result).toEqual({ guestToken: "abc", remainingScans: 1 });
  });

  it("throws ApiError with the response status and body on a non-ok response", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "guestToken must be a non-empty string" }),
    });

    await expect(fetchGuestInit("")).rejects.toMatchObject({
      status: 400,
      body: { error: "guestToken must be a non-empty string" },
    });
  });
});

describe("fetchMe", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("GETs /api/me with a bearer token and returns the parsed body", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        email: "a@b.com",
        role: "user",
        plan: { name: "Free", tier: "free", scanLimit: 3 },
        remainingScans: 3,
      }),
    });

    const result = await fetchMe("jwt123");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/me"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer jwt123" }),
      })
    );
    expect(result.plan.tier).toBe("free");
  });
});

describe("consumeScan", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends the guestToken in the body when no clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ remainingScans: 0 }) });

    await consumeScan({ guestToken: "g1" });

    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ guestToken: "g1" });
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("sends a bearer token and an empty body when clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ remainingScans: 2 }) });

    await consumeScan({ clerkToken: "jwt123" });

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt123");
    expect(JSON.parse(options.body)).toEqual({});
  });

  it("throws ApiError(402) with plan/scanLimit/used on quota exceeded", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ plan: "Guest", scanLimit: 1, used: 1 }),
    });

    await expect(consumeScan({ guestToken: "g1" })).rejects.toBeInstanceOf(ApiError);
    await expect(consumeScan({ guestToken: "g1" })).rejects.toMatchObject({
      status: 402,
      body: { plan: "Guest", scanLimit: 1, used: 1 },
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- auth.test.js`
Expected: FAIL — `src/lib/auth.js` does not exist yet.

- [ ] **Step 3: Implement `src/lib/auth.js`**

```js
const GUEST_TOKEN_KEY = "websight_guest_token";
export const GUEST_SCAN_LIMIT = 1;

let memoryGuestToken = null;

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateGuestToken() {
  try {
    let token = window.localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      token = randomToken();
      window.localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    if (!memoryGuestToken) memoryGuestToken = randomToken();
    return memoryGuestToken;
  }
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export function fetchGuestInit(guestToken) {
  return apiFetch("/api/scans/guest-init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestToken }),
  });
}

export function fetchMe(clerkToken) {
  return apiFetch("/api/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
}

export function consumeScan({ guestToken, clerkToken } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (clerkToken) headers.Authorization = `Bearer ${clerkToken}`;
  return apiFetch("/api/scans/consume", {
    method: "POST",
    headers,
    body: JSON.stringify(clerkToken ? {} : { guestToken }),
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- auth.test.js`
Expected: PASS (all cases above)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.js src/lib/auth.test.js
git commit -m "Add auth.js API client for guest/Clerk scan quota endpoints"
```

---

### Task 3: `src/lib/access.js` and `ui/UpsellNotice.jsx`

**Files:**
- Create: `src/lib/access.js`
- Create: `src/components/ui/UpsellNotice.jsx`
- Test: `src/components/ui/UpsellNotice.test.jsx`

**Interfaces:**
- Produces:
  - `RESTRICTED_TABS: string[]` (= `["templates", "xray", "apis", "export"]`)
  - `UpsellNotice({ title: string, message: string })` — pure presentational component, no props for tier/variant since the caller (Task 6) already computes the exact copy.

- [ ] **Step 1: Write `src/lib/access.js`**

```js
export const RESTRICTED_TABS = ["templates", "xray", "apis", "export"];
```

No test needed for this file — it's a single exported constant, exercised indirectly by Sidebar.test.jsx and App.test.jsx in later tasks.

- [ ] **Step 2: Write the failing test for `UpsellNotice`**

Create `src/components/ui/UpsellNotice.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpsellNotice } from "./UpsellNotice";

describe("UpsellNotice", () => {
  it("renders the given title and message", () => {
    render(<UpsellNotice title="Upgrade to unlock this tab" message="This tab is available on paid plans." />);
    expect(screen.getByText("Upgrade to unlock this tab")).toBeInTheDocument();
    expect(screen.getByText("This tab is available on paid plans.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test -- UpsellNotice.test.jsx`
Expected: FAIL — `./UpsellNotice` does not exist.

- [ ] **Step 4: Implement `UpsellNotice.jsx`**

```jsx
import { T } from "../../lib/theme";

export function UpsellNotice({ title, message }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 300,
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>🔒</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text0, fontFamily: T.sans }}>{title}</div>
      <div style={{ fontSize: 13, color: T.text1, fontFamily: T.body, maxWidth: 360 }}>{message}</div>
    </div>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm run test -- UpsellNotice.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/access.js src/components/ui/UpsellNotice.jsx src/components/ui/UpsellNotice.test.jsx
git commit -m "Add RESTRICTED_TABS constant and shared UpsellNotice component"
```

---

### Task 4: `HomePage.jsx`

**Files:**
- Create: `src/components/HomePage.jsx`
- Test: `src/components/HomePage.test.jsx`

**Interfaces:**
- Consumes: `getOrCreateGuestToken`, `fetchGuestInit`, `GUEST_SCAN_LIMIT` from `../lib/auth`; `useClerk` from `@clerk/clerk-react`.
- Produces: `HomePage({ onGuestAccess: (access) => void })`. On a successful guest-init, calls `onGuestAccess` with `{tier:'guest', planName:'Guest', scanLimit: GUEST_SCAN_LIMIT, remainingScans, loading:false, error:null}`. The "Log in" button only calls Clerk's `openSignIn()` — it does not call any prop, since the login *result* is observed globally via Clerk's `useAuth().isSignedIn` in `App.jsx` (Task 6), not through this component.

- [ ] **Step 1: Write the failing tests**

Create `src/components/HomePage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomePage } from "./HomePage";

const openSignIn = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ openSignIn }),
}));

vi.mock("../lib/auth", async () => {
  const actual = await vi.importActual("../lib/auth");
  return { ...actual, getOrCreateGuestToken: vi.fn(), fetchGuestInit: vi.fn() };
});

import { getOrCreateGuestToken, fetchGuestInit } from "../lib/auth";

describe("HomePage", () => {
  beforeEach(() => {
    openSignIn.mockClear();
    getOrCreateGuestToken.mockReset().mockReturnValue("guest-token-1");
    fetchGuestInit.mockReset();
  });

  it("renders the hero and both entry buttons", () => {
    render(<HomePage onGuestAccess={() => {}} />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });

  it("calls openSignIn when 'Log in' is clicked", () => {
    render(<HomePage onGuestAccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(openSignIn).toHaveBeenCalledTimes(1);
  });

  it("initializes a guest session and reports access on 'Continue as Guest'", async () => {
    fetchGuestInit.mockResolvedValue({ guestToken: "guest-token-1", remainingScans: 1 });
    const onGuestAccess = vi.fn();
    render(<HomePage onGuestAccess={onGuestAccess} />);

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() => expect(onGuestAccess).toHaveBeenCalledTimes(1));
    expect(fetchGuestInit).toHaveBeenCalledWith("guest-token-1");
    expect(onGuestAccess).toHaveBeenCalledWith({
      tier: "guest",
      planName: "Guest",
      scanLimit: 1,
      remainingScans: 1,
      loading: false,
      error: null,
    });
  });

  it("shows an inline error and does not call onGuestAccess if guest-init fails", async () => {
    fetchGuestInit.mockRejectedValue(new Error("network down"));
    const onGuestAccess = vi.fn();
    render(<HomePage onGuestAccess={onGuestAccess} />);

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() =>
      expect(screen.getByText(/couldn.t start your guest session/i)).toBeInTheDocument()
    );
    expect(onGuestAccess).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- HomePage.test.jsx`
Expected: FAIL — `./HomePage` does not exist.

- [ ] **Step 3: Implement `HomePage.jsx`**

```jsx
import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { T } from "../lib/theme";
import { getOrCreateGuestToken, fetchGuestInit, GUEST_SCAN_LIMIT } from "../lib/auth";

export function HomePage({ onGuestAccess }) {
  const { openSignIn } = useClerk();
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState(null);

  async function handleContinueAsGuest() {
    setGuestError(null);
    setGuestLoading(true);
    try {
      const token = getOrCreateGuestToken();
      const { remainingScans } = await fetchGuestInit(token);
      onGuestAccess({
        tier: "guest",
        planName: "Guest",
        scanLimit: GUEST_SCAN_LIMIT,
        remainingScans,
        loading: false,
        error: null,
      });
    } catch {
      setGuestError("Couldn't start your guest session — try again.");
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 620,
        gap: 24,
        background: T.bg0,
        color: T.text0,
        fontFamily: T.body,
        textAlign: "center",
        padding: 20,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.sans, letterSpacing: "-.5px" }}>
        WebSight
      </div>
      <div style={{ fontSize: 15, color: T.text1, maxWidth: 420 }}>
        See exactly what's on a website — sitemap, page templates, and every
        third-party API it talks to.
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => openSignIn()}
          style={{
            padding: "10px 26px",
            background: `linear-gradient(135deg,${T.accent},${T.violet})`,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            fontFamily: T.sans,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Log in
        </button>
        <button
          onClick={handleContinueAsGuest}
          disabled={guestLoading}
          style={{
            padding: "10px 26px",
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text0,
            fontSize: 14,
            fontFamily: T.sans,
            fontWeight: 600,
            cursor: guestLoading ? "default" : "pointer",
            opacity: guestLoading ? 0.6 : 1,
          }}
        >
          {guestLoading ? "Starting…" : "Continue as Guest"}
        </button>
      </div>
      {guestError && (
        <div style={{ fontSize: 13, color: T.red, fontFamily: T.body }}>{guestError}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- HomePage.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/HomePage.jsx src/components/HomePage.test.jsx
git commit -m "Add HomePage with Clerk login and guest-mode entry points"
```

---

### Task 5: `Sidebar.jsx` — lock icons on restricted tabs

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/Sidebar.test.jsx`

**Interfaces:**
- Consumes: `RESTRICTED_TABS` from `../lib/access`.
- Produces: `Sidebar({tab, setTab, projects, access})` — `access` is `{tier, ...}` (same shape Task 6 defines) or `undefined`/partial during initial render; treat a missing/non-`'paid'` tier as restricted (fails closed, matching the spec's error-handling rule).
- The existing hardcoded "Starter plan" / "Upgrade ↗" footer is untouched (see Global Constraints) — do not rename, restyle, or remove it in this task.

- [ ] **Step 1: Extend the failing test**

Add to `src/components/Sidebar.test.jsx` (keep the existing two tests as-is):

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const projects = [{ id: 1, name: "bswhealth.com", status: "done", score: 94 }];

describe("Sidebar", () => {
  // ...existing two tests unchanged...

  it("shows lock icons on the 4 restricted tabs when access is not paid", () => {
    render(
      <Sidebar
        tab="overview"
        setTab={() => {}}
        projects={projects}
        access={{ tier: "guest" }}
      />
    );
    for (const label of ["Templates", "X-Ray", "APIs", "Export"]) {
      expect(within(screen.getByText(label).closest("button")).getByText("🔒")).toBeInTheDocument();
    }
    for (const label of ["Overview", "Sitemap"]) {
      expect(within(screen.getByText(label).closest("button")).queryByText("🔒")).not.toBeInTheDocument();
    }
  });

  it("shows no lock icons when access.tier is paid", () => {
    render(
      <Sidebar
        tab="overview"
        setTab={() => {}}
        projects={projects}
        access={{ tier: "paid" }}
      />
    );
    expect(screen.queryByText("🔒")).not.toBeInTheDocument();
  });
});
```

Add `within` to the existing `@testing-library/react` import at the top of the file.

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm run test -- Sidebar.test.jsx`
Expected: the two new tests FAIL (no lock icon rendered yet); the two pre-existing tests still PASS.

- [ ] **Step 3: Implement the lock icons**

Edit `src/components/Sidebar.jsx`:

```jsx
import { T, hex2rgb } from "../lib/theme";
import { RESTRICTED_TABS } from "../lib/access";

const NAV=[
  {id:"overview",icon:"⊞",label:"Overview"},{id:"sitemap",icon:"⊛",label:"Sitemap"},
  {id:"templates",icon:"⊟",label:"Templates"},{id:"xray",icon:"◈",label:"X-Ray"},
  {id:"apis",icon:"⊕",label:"APIs"},{id:"export",icon:"↓",label:"Export"},
];

export function Sidebar({tab,setTab,projects,access}){
  return(
    <div style={{width:200,background:T.bg1,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:620}}>
      <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:14,color:"#fff",fontWeight:700,fontFamily:T.sans}}>W</span></div>
          <div><div style={{fontSize:13,fontWeight:700,color:T.text0,fontFamily:T.sans,letterSpacing:"-.3px"}}>WebSight</div><div style={{fontSize:10,color:T.accent,fontFamily:T.mono,letterSpacing:".5px"}}>DISCOVERY</div></div>
        </div>
      </div>
      <div style={{padding:"10px 8px",flex:1}}>
        <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,letterSpacing:".8px",padding:"6px 8px 4px",fontWeight:600}}>ANALYSIS</div>
        {NAV.map(n=>{
          const active=tab===n.id;
          const restricted=RESTRICTED_TABS.includes(n.id)&&access?.tier!=="paid";
          return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:2,background:active?T.accentDim:"transparent",border:active?`1px solid ${T.border}`:"1px solid transparent",borderRadius:8,color:active?T.text0:T.text1,cursor:"pointer",fontSize:13,fontFamily:T.sans,fontWeight:active?500:400,textAlign:"left",transition:"all .12s"}}>
            <span style={{fontSize:14,width:18,textAlign:"center",color:active?T.accent:T.text2}}>{n.icon}</span>{n.label}
            {restricted&&<span style={{marginLeft:"auto",fontSize:11}}>🔒</span>}
          </button>);
        })}
        <div style={{height:1,background:T.border,margin:"6px 0"}}/>
        <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,letterSpacing:".8px",padding:"8px 8px 4px",fontWeight:600}}>PROJECTS</div>
        {projects.map(p=>(
          <div key={p.id} style={{padding:"7px 10px",borderRadius:8,marginBottom:2,background:p.name==="bswhealth.com"?T.accentDim:"transparent",border:p.name==="bswhealth.com"?`1px solid ${T.border}`:"1px solid transparent",cursor:"pointer"}}>
            <div style={{fontSize:12,color:p.name==="bswhealth.com"?T.text0:T.text1,fontFamily:T.mono,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
            <div style={{fontSize:10,color:T.text2,fontFamily:T.body,marginTop:2,display:"flex",justifyContent:"space-between"}}><span>{p.status==="done"?"✓ Done":"… Queued"}</span>{p.score&&<span style={{color:p.score>85?T.green:T.amber}}>{p.score}</span>}</div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.text2,fontFamily:T.body,lineHeight:1.5}}>
          <div style={{color:T.text1,fontWeight:500,marginBottom:2}}>Starter plan</div><div>3 / 10 analyses used</div>
          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,marginTop:6}}><div style={{height:"100%",width:"30%",background:T.accent,borderRadius:2}}/></div>
        </div>
        <button style={{marginTop:10,width:"100%",padding:"7px",background:`rgba(${hex2rgb(T.accent)},0.15)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.3)`,borderRadius:7,color:T.accent,fontSize:12,fontFamily:T.sans,fontWeight:500,cursor:"pointer"}}>Upgrade ↗</button>
      </div>
    </div>
  );
}
```

(Only the `import`, the `NAV.map` body, and the new `RESTRICTED_TABS` import changed — the footer block is copied verbatim, unchanged, per the Global Constraints.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- Sidebar.test.jsx`
Expected: PASS (all four tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Sidebar.test.jsx
git commit -m "Sidebar: show lock icons on restricted tabs based on access tier"
```

---

### Task 6: `App.jsx` — home/dashboard view switch, access resolution, tab gating, Analyze wiring

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `useAuth` from `@clerk/clerk-react`; `HomePage` (Task 4, prop `onGuestAccess`); `Sidebar` (Task 5, prop `access`); `UpsellNotice` (Task 3, props `title`/`message`); `getOrCreateGuestToken`, `fetchMe`, `consumeScan`, `ApiError` from `./lib/auth`; `RESTRICTED_TABS` from `./lib/access`.
- Produces: the `access` shape used across the app: `{tier: 'guest'|'free'|'paid'|null, planName: string, scanLimit: number, remainingScans: number, loading: boolean, error: string|null}`.

**Design decisions for this task (beyond what the spec states verbatim):**

1. Login and guest are wired differently, matching how each is *observed*:
   - Guest: `HomePage`'s "Continue as Guest" button already does the async work (Task 4) and calls `onGuestAccess(access)` once done. `App.jsx`'s handler for this just does `setAccess(access); setView('dashboard')`.
   - Login: Clerk's `useAuth().isSignedIn` is global state, not tied to which button was clicked (Clerk's hosted modal can resolve after `HomePage` has already unmounted in edge cases). `App.jsx` watches it directly with a `useEffect`, calling `fetchMe` and transitioning to `'dashboard'` the moment it flips true.
2. Neither the guest token nor the Clerk JWT is held in React state. `getOrCreateGuestToken()` just re-reads `localStorage` (cheap, idempotent) and Clerk's `getToken()` is called fresh every time a JWT is needed (JWTs expire; always fetching a fresh one avoids ever sending a stale token).
3. `analyzeError` is a new local state (`{kind: 'quota', body} | {kind: 'generic'} | null`) driven by `consumeScan`'s outcome. It is cleared whenever the user switches tabs (via a small `handleSetTab` wrapper passed to `Sidebar`) or clicks Analyze again — it's transient feedback about the *last* Analyze click, not a persistent lock on tab content (that's what `access.tier`/`RESTRICTED_TABS` already handle).
4. The existing pre-gating tests ("switches tabs when a sidebar item is clicked") asserted on the **APIs** tab, which this plan locks for guest/free tiers. That test is changed to assert tab-switching against the **Sitemap** tab (unrestricted, preserves the "clicking a sidebar item changes the tab" behavior it was testing), and a *new* paid-tier test is added so real APIs-tab content is still regression-tested end-to-end, just under the tier that's actually allowed to see it.

- [ ] **Step 1: Write the failing tests**

Replace `src/App.test.jsx` with:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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
    consumeScan: vi.fn(),
  };
});

import { fetchGuestInit, fetchMe, consumeScan, ApiError } from "./lib/auth";

async function continueAsGuest() {
  fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
  await vi.waitFor(() => screen.getByText("Baylor Scott & White Health"));
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsSignedIn = false;
    fetchGuestInit.mockReset().mockResolvedValue({ guestToken: "guest-token-1", remainingScans: 1 });
    fetchMe.mockReset();
    consumeScan.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the home page before any login/guest choice", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
    expect(screen.queryByText("Baylor Scott & White Health")).not.toBeInTheDocument();
  });

  it("renders the Overview tab by default once past the home screen as a guest", async () => {
    render(<App />);
    await continueAsGuest();
    expect(screen.getByText("Baylor Scott & White Health")).toBeInTheDocument();
  });

  it("switches tabs when a sidebar item is clicked", async () => {
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
    render(<App />);
    await vi.waitFor(() => screen.getByText("Baylor Scott & White Health"));

    fireEvent.click(screen.getByText("APIs"));
    expect(screen.getByText("Phynd Provider Directory API")).toBeInTheDocument();
  });

  it("runs the fake analyze/loading sequence after a successful consumeScan", async () => {
    consumeScan.mockResolvedValue({ remainingScans: 0 });
    render(<App />);
    await continueAsGuest();

    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await vi.waitFor(() => expect(screen.getByText("Analyzing website")).toBeInTheDocument());
    expect(analyzeButton).toBeDisabled();

    await vi.advanceTimersByTimeAsync(6 * 500 + 500);

    expect(screen.queryByText("Analyzing website")).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /analyze/i })).getByText(/analyze/i)).toBeInTheDocument();
  });

  it("shows a quota-exceeded UpsellNotice instead of the loading animation on a second Analyze click", async () => {
    consumeScan
      .mockResolvedValueOnce({ remainingScans: 0 })
      .mockRejectedValueOnce(new ApiError(402, { plan: "Guest", scanLimit: 1, used: 1 }));
    render(<App />);
    await continueAsGuest();

    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeButton);
    await vi.advanceTimersByTimeAsync(6 * 500 + 500);

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await vi.waitFor(() => expect(screen.getByText("Scan limit reached")).toBeInTheDocument());
    expect(screen.getByText(/log in for more/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- App.test.jsx`
Expected: FAIL — `App.jsx` has no home screen yet, `Sidebar`/`consumeScan` gating doesn't exist.

- [ ] **Step 3: Implement `App.jsx`**

```jsx
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { T } from "./lib/theme";
import { BSW } from "./lib/mockData";
import { RESTRICTED_TABS } from "./lib/access";
import { getOrCreateGuestToken, fetchMe, consumeScan, ApiError } from "./lib/auth";
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

const STEP_LABELS=["Fetching sitemap files…","Discovering URL patterns…","Identifying templates…","Detecting APIs…","Analyzing tech stack…","Building report…"];

const INITIAL_ACCESS = { tier: null, planName: "", scanLimit: 0, remainingScans: 0, loading: false, error: null };

export default function App(){
  const[view,setView]=useState("home");
  const[access,setAccess]=useState(INITIAL_ACCESS);
  const[analyzeError,setAnalyzeError]=useState(null);
  const[tab,setTab]=useState("overview");
  const[data]=useState(BSW);
  const[url,setUrl]=useState("https://www.bswhealth.com");
  const[loading,setLoading]=useState(false);
  const[step,setStep]=useState(0);
  const{isSignedIn,getToken}=useAuth();

  useEffect(()=>{
    if(!isSignedIn)return;
    setView("dashboard");
    setAccess(a=>({...a,loading:true,error:null}));
    let cancelled=false;
    (async()=>{
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

  useEffect(()=>{
    if(!loading)return;
    const id=setInterval(()=>{
      setStep(s=>{
        if(s>=STEP_LABELS.length-1){
          clearInterval(id);
          setTimeout(()=>setLoading(false),400);
          return s;
        }
        return s+1;
      });
    },500);
    return()=>clearInterval(id);
  },[loading]);

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
    try{
      const clerkToken=isSignedIn?await getToken():undefined;
      const guestToken=isSignedIn?undefined:getOrCreateGuestToken();
      const result=await consumeScan({guestToken,clerkToken});
      setAccess(a=>({...a,remainingScans:result.remainingScans}));
      setStep(0);
      setLoading(true);
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

  const tabContent=()=>{
    if(loading)return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:20}}>
        <div style={{width:36,height:36,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
        <div style={{fontSize:15,fontWeight:600,color:T.text0,fontFamily:T.sans}}>Analyzing website</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,width:280}}>{STEP_LABELS.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:i<step?T.green:i===step?T.text0:T.text2,fontFamily:T.body}}>
            <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:i<step?T.green:i===step?T.accent:"rgba(255,255,255,0.1)",boxShadow:i===step?`0 0 8px ${T.accent}`:""}}/>{s}
          </div>))}</div>
      </div>);
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
          <Sidebar tab={tab} setTab={handleSetTab} projects={data.projects} access={access}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{background:T.bg1,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:14,color:T.text2}}>🌐</span>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}/>
              <button onClick={handleAnalyzeClick} disabled={loading} style={{padding:"8px 22px",background:`linear-gradient(135deg,${T.accent},${T.violet})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontFamily:T.sans,fontWeight:600,cursor:loading?"default":"pointer",whiteSpace:"nowrap",letterSpacing:".2px",opacity:loading?0.6:1}}>Analyze ↗</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>{tabContent()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- App.test.jsx`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Run the full test suite and lint**

Run: `npm run lint && npm run test`
Expected: everything passes, including `Sidebar.test.jsx`, `HomePage.test.jsx`, `auth.test.js`, `UpsellNotice.test.jsx` from earlier tasks and the pre-existing `Badge`/`Chip` tests.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "App: add home/dashboard view switch, resolve access from guest/Clerk login, gate restricted tabs"
```

---

### Task 7: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

This repo's own `CLAUDE.md` says: *"If you add real data fetching, backend calls, or new dependencies, update this file and ROADMAP.md so future sessions don't work from stale assumptions."* This plan adds both (Clerk, `fetch` calls to `websight-data`). `ROADMAP.md` is intentionally left untouched — this feature is explicitly not a ROADMAP phase per the backend spec's own framing.

- [ ] **Step 1: Update the "What this is" and "Stack" sections**

In `CLAUDE.md`, replace:

```markdown
**There is no backend, no crawler, no database, and no live data.** Every
number and screenshot description on screen comes from one hardcoded object
(`BSW` in `src/lib/mockData.js`). Do not assume any API call, fetch, or
persistence layer exists unless you've just added it yourself. See
`ROADMAP.md` for the plan to make this real.
```

with:

```markdown
**Scan results are still fully mocked.** Every number and screenshot
description on screen comes from one hardcoded object (`BSW` in
`src/lib/mockData.js`) — see `ROADMAP.md` for the plan to make that part
real (Phase 4).

**Auth and scan quota are real**, layered on top of that mock: this app
calls the separately-deployed `websight-data` API (`src/lib/auth.js`) for
Clerk login, guest-mode tokens, and per-scan quota enforcement. See
`docs/superpowers/specs/2026-07-28-home-login-guest-gating-design.md` for
the design. Do not assume any *other* API call, fetch, or persistence layer
exists beyond what's in `src/lib/auth.js`.
```

And in the "Stack" section, add a line after the React/Vite line:

```markdown
- `@clerk/clerk-react` for auth (login UI, session JWTs) — see `.env.example`
  for the required `VITE_CLERK_PUBLISHABLE_KEY` / `VITE_API_BASE_URL`.
```

- [ ] **Step 2: Add `src/lib/auth.js` and the new components to the Architecture section**

Add after the `src/lib/xrayContent.jsx` bullet:

```markdown
- `src/lib/auth.js` — plain functions for the `websight-data` API: guest
  token creation, `fetchGuestInit`/`fetchMe`/`consumeScan`. No component
  calls `fetch` directly; everything goes through this module.
- `src/lib/access.js` — `RESTRICTED_TABS`, the tab ids gated behind a paid
  plan, shared by `Sidebar` and `App`.
```

And after the `src/components/ui/` bullet:

```markdown
- `src/components/HomePage.jsx` — the pre-dashboard screen: Clerk login
  entry point and guest-mode entry point.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Document Clerk auth and the websight-data API integration in CLAUDE.md"
```

---

### Task 8: Final whole-branch verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite from a clean state**

Run: `npm ci && npm run lint && npm run test && npm run build`
Expected: all four succeed with no warnings introduced by this branch.

- [ ] **Step 2: Manual smoke check with the dev server**

Run: `npm run dev`, then in a browser:
- Confirm the home page renders with both buttons (Clerk key from `.env.local` needed for "Log in" to actually open a modal — if no real Clerk project is configured yet, skip that button and just verify it doesn't crash the page).
- Click "Continue as Guest" (this requires `VITE_API_BASE_URL` pointing at a running/deployed `websight-data` instance) → confirm dashboard renders, Templates/X-Ray/APIs/Export show the lock icon and an `UpsellNotice` instead of tab content, Overview/Sitemap render normally.
- Click Analyze once → confirm the existing fake loading sequence still plays, then the mock report renders.
- Click Analyze a second time → confirm the quota-exceeded `UpsellNotice` renders instead of the loading sequence.

If no live `websight-data` deployment is reachable, note this explicitly rather than claiming the manual check passed — the automated tests from Tasks 1–7 (which mock the API) are the verified coverage in that case.

- [ ] **Step 3: Report status**

Summarize to the user: all tasks committed on the `home-login-guest-gating` branch, full test/lint/build passing, manual smoke check result (or why it was skipped). Do not open a PR or merge unless asked.

---

## Self-Review

**Spec coverage:**
- `access` shape, guest/free/paid tiers, guest hardcoded constants → Task 2 (`GUEST_SCAN_LIMIT`), Task 4, Task 6.
- `view` state, no router, prop-passed access → Task 6.
- `HomePage`, `Sidebar` lock icons, `UpsellNotice` → Tasks 3, 4, 5.
- `src/lib/auth.js` exact function list → Task 2.
- `.env.example`, `@clerk/clerk-react` dependency, `main.jsx` `ClerkProvider` → Task 1.
- Request/data flow steps 1–5 (home → guest/login → dashboard gating → Analyze → 200/402/other) → Task 6.
- Error handling (`localStorage` fallback, fails-closed on `fetchMe` error, 401 on `consumeScan` treated as generic) → Task 2 (fallback), Task 6 (fails-closed via `tier !== 'paid'` default, 401 falls into the generic `ApiError` branch since only `402` is special-cased).
- Testing section's specific test files → Tasks 2–6 each include the named test file.
- Out-of-scope items (real crawl data, self-service upgrade, admin UI, React Router, cross-device guest identity) → none of these are touched by any task; the Sidebar footer/Upgrade button exception is called out explicitly in Global Constraints and Task 5.

**Placeholder scan:** no "TBD"/"handle edge cases"/"similar to Task N" language — every step has runnable code.

**Type/name consistency check:**
- `access` fields (`tier`, `planName`, `scanLimit`, `remainingScans`, `loading`, `error`) are identical across Task 4 (`HomePage`'s `onGuestAccess` payload), Task 5 (`Sidebar`'s `access` prop read), and Task 6 (`App.jsx`'s `INITIAL_ACCESS` and the `fetchMe`-driven `setAccess` call).
- `RESTRICTED_TABS` is defined once in `src/lib/access.js` (Task 3) and imported identically in Task 5 and Task 6 — no duplicate list.
- `ApiError`/`.status`/`.body` fields are defined in Task 2 and consumed with matching field names in Task 6's `handleAnalyzeClick`.
- `consumeScan({guestToken, clerkToken})` call signature matches between Task 2's implementation and Task 6's call site.
