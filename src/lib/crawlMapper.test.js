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
