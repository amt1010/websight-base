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
