import { T } from "./theme";

const PALETTE = [T.accent, T.violet, T.cyan, T.green, T.amber];

export function buildSitemapNodes(pages, domain) {
  const root = { id: "root", label: domain, parent: null, count: pages.length };
  const nodes = new Map();

  for (const page of pages) {
    const segments = page.path.split("/").filter(Boolean).slice(0, 2);
    for (let depth = 1; depth <= segments.length; depth++) {
      const id = segments.slice(0, depth).join("/");
      const parent = depth === 1 ? "root" : segments.slice(0, depth - 1).join("/");
      const existing = nodes.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        nodes.set(id, { id, label: segments[depth - 1], parent, count: 1 });
      }
    }
  }

  return [root, ...nodes.values()];
}

function formatDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function mapMetrics(crawl) {
  const sections = buildSitemapNodes(crawl.pages, crawl.domain).filter((n) => n.parent === "root").length;
  return {
    pages: crawl.pages.length,
    sections,
    templates: crawl.clusters.length,
    apis: crawl.integrations.length,
    crawlTime: formatDuration(crawl.startedAt, crawl.finishedAt),
  };
}

export function mapTemplates(clusters, totalPages) {
  return clusters.map((c, i) => ({
    id: c.urlPattern || `cluster-${i}`,
    name: c.urlPattern,
    count: c.pageUrls.length,
    total: totalPages,
    pattern: c.urlPattern,
    color: PALETTE[i % PALETTE.length],
  }));
}

export function mapIntegrations(integrations) {
  return integrations.map((integration, i) => ({
    name: integration.name,
    type: integration.category,
    color: PALETTE[i % PALETTE.length],
    endpoints: integration.matchedUrls,
  }));
}

function formatDate(startedAt) {
  if (!startedAt) return "Queued";
  return new Date(startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function mapProjects(crawlsListResponse) {
  return (crawlsListResponse.crawls ?? []).map((c) => ({
    id: c.id,
    name: c.domain,
    status: c.status,
    date: formatDate(c.startedAt),
  }));
}
