import { defineConfig } from "vitepress";
import type { HeadConfig } from "vitepress";

const CANONICAL_BASE = "https://bunwaylabs.github.io/bunway/";

function createCanonicalUrl(relativePath?: string): string {
  const base = CANONICAL_BASE.endsWith("/") ? CANONICAL_BASE : `${CANONICAL_BASE}/`;
  if (!relativePath) return base;
  let normalized = relativePath.replace(/\\/g, "/");
  normalized = normalized.replace(/(^|\/)index\.md$/, "$1");
  if (normalized && normalized.endsWith(".md")) {
    normalized = normalized.replace(/\.md$/, ".html");
  }
  return new URL(normalized, base).toString();
}

export default defineConfig({
  base: "/bunway/",
  title: "bunWay",
  description: "Bun-native routing toolkit",
  appearance: true,
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#1e7c73" }],
    ["meta", { name: "description", content: "Run everything. The Bun way." }],
    ["meta", { property: "og:title", content: "bunWay" }],
    ["meta", { property: "og:description", content: "Run everything. The Bun way." }],
    [
      "meta",
      { name: "google-site-verification", content: "MfUtITfQjC9X52HpWU_55nMEkiQTpunoH2pMPqg6unM" },
    ],
  ],
  sitemap: {
    hostname: CANONICAL_BASE,
  },
  transformHead({ pageData }) {
    const canonical = createCanonicalUrl(pageData.relativePath);
    const head: HeadConfig[] = [["link", { rel: "canonical", href: canonical }]];
    if (pageData.description) {
      head.push(["meta", { name: "description", content: pageData.description }]);
      head.push(["meta", { property: "og:description", content: pageData.description }]);
    }
    return head;
  },
  themeConfig: {
    nav: [{ text: "API Reference", link: "https://bunwaylabs.github.io/bunway/api/index.html" }],
    outline: [2, 3],
    docFooter: {
      prev: "Previous",
      next: "Next",
    },
    sidebar: [
      {
        text: "🧭 Essentials",
        items: [
          { text: "Overview", link: "/guide/overview" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Core Primitives", link: "/guide/core-primitives" },
          { text: "Router", link: "/guide/router" },
        ],
      },
      {
        text: "🧩 Middleware",
        items: [
          { text: "Overview", link: "/middleware/index" },
          { text: "Body Parsing", link: "/middleware/body-parsing" },
          { text: "CORS", link: "/middleware/cors" },
          { text: "Error Handling", link: "/middleware/error-handler" },
        ],
      },
      {
        text: "🤝 Community",
        items: [{ text: "Roadmap & Contributions", link: "/community/build-together" }],
      },
      {
        text: "📚 Reference",
        items: [{ text: "API Reference", link: "/api/index.html" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/bunwaylabs/bunway" },
      { icon: "npm", link: "https://www.npmjs.com/package/bunway" }
    ],
  },
});
