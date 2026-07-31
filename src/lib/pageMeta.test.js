import { describe, it, expect } from "vitest";
import { extractDescription } from "./pageMeta";

describe("extractDescription", () => {
  it("returns null for null html", () => {
    expect(extractDescription(null)).toBeNull();
  });

  it("reads meta name=description", () => {
    const html = `<html><head><meta name="description" content="A great site."></head></html>`;
    expect(extractDescription(html)).toBe("A great site.");
  });

  it("falls back to og:description when name=description is missing", () => {
    const html = `<html><head><meta property="og:description" content="OG desc."></head></html>`;
    expect(extractDescription(html)).toBe("OG desc.");
  });

  it("falls back to the page title when no meta description exists", () => {
    const html = `<html><head><title>My Site</title></head></html>`;
    expect(extractDescription(html)).toBe("My Site");
  });

  it("returns null when nothing is found", () => {
    expect(extractDescription("<html><head></head></html>")).toBeNull();
  });
});
