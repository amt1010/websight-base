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
  const textParts = [];
  if (textDoc.body) {
    const walker = textDoc.createTreeWalker(textDoc.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const trimmed = node.textContent.replace(/\s+/g, " ").trim();
      if (trimmed) textParts.push(trimmed);
    }
  }
  const text = textParts.join(" ");

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
