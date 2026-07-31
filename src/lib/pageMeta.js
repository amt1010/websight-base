export function extractDescription(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const meta =
    doc.querySelector('meta[name="description"]') ??
    doc.querySelector('meta[property="og:description"]');
  const content = meta?.getAttribute("content")?.trim();
  if (content) return content;
  const title = doc.querySelector("title")?.textContent?.trim();
  return title || null;
}
