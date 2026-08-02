function csvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(pages) {
  const header = ["url", "path", "depth", "status"];
  const rows = (pages ?? []).map((p) => [p.url, p.path, p.depth, p.status]);
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\n");
}

function escapeHtml(value) {
  const str = String(value ?? "");
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function buildReportHtml(data) {
  const metricsRows = [
    ["Total pages", data.metrics.pages],
    ["Sitemap sections", data.metrics.sections],
    ["Page templates", data.metrics.templates],
    ["APIs detected", data.metrics.apis],
    ["Crawl time", data.metrics.crawlTime],
  ]
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  const templateRows = (data.templates ?? [])
    .map((t) => `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.pattern)}</td><td>${escapeHtml(t.count)}</td></tr>`)
    .join("");

  const apiRows = (data.apis ?? [])
    .map((a) => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.type)}</td><td>${escapeHtml((a.endpoints ?? []).join(", "))}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(data.domain)} — Discovery Report</title>
<style>
body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:32px;}
h1{font-size:22px;margin-bottom:4px;}
h2{font-size:15px;margin-top:28px;border-bottom:1px solid #ccc;padding-bottom:4px;}
table{width:100%;border-collapse:collapse;margin-top:8px;}
td{padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;}
</style>
</head>
<body>
<h1>${escapeHtml(data.domain)}</h1>
<h2>Metrics</h2>
<table>${metricsRows}</table>
<h2>Page templates</h2>
<table>${templateRows || "<tr><td>No templates detected.</td></tr>"}</table>
<h2>Detected APIs</h2>
<table>${apiRows || "<tr><td>No third-party APIs detected.</td></tr>"}</table>
</body>
</html>`;
}

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openPrintableReport(data) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildReportHtml(data));
  win.document.close();
  win.focus();
  win.print();
}
