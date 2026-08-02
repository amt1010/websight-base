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
