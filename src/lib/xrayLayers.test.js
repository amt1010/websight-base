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
    const availability = Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.hasContent(empty, { htmlUrl: null })]));
    expect(availability).toEqual({ visual: true, text: false, html: false, css: false, network: false, schema: false });
  });

  it("html is available whenever the page has an htmlUrl, even before its content has been derived", () => {
    const empty = deriveLayers(null);
    const availability = Object.fromEntries(
      LAYER_DEFS.map((l) => [l.id, l.hasContent(empty, { htmlUrl: "https://x/a.html" })])
    );
    expect(availability).toEqual({ visual: true, text: false, html: true, css: false, network: false, schema: false });
  });
});
