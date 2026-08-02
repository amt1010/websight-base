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
