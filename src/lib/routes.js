export const TAB_SLUGS = {
  overview: "overview",
  sitemap: "sitemap",
  templates: "templates",
  xray: "x-ray",
  apis: "apis",
  export: "export",
};

export const SLUG_TABS = Object.fromEntries(Object.entries(TAB_SLUGS).map(([id, slug]) => [slug, id]));

export const DEFAULT_TAB = "overview";
