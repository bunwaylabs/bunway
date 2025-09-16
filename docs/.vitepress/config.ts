import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/bunway/",
  title: "bunWay",
  description: "Bun-native routing toolkit",
  appearance: "dark",
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#1e7c73" }],
    ["meta", { name: "description", content: "Run everything. The Bun way." }],
    ["meta", { property: "og:title", content: "bunWay" }],
    ["meta", { property: "og:description", content: "Run everything. The Bun way." }],
  ],
  themeConfig: {
    nav: [{ text: "API Reference", link: "https://bunwaylabs.github.io/bunway/api/index.html" }],
    outline: [2, 3],
    docFooter: {
      prev: "Previous",
      next: "Next",
    },
    sidebar: [
      {
        text: "Essentials",
        items: [
          { text: "Overview", link: "/guide/overview" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Core Primitives", link: "/guide/core-primitives" },
          { text: "Router", link: "/guide/router" },
        ],
      },
      {
        text: "Middleware",
        items: [
          { text: "Overview", link: "/middleware/index" },
          { text: "Body Parsing", link: "/middleware/body-parsing" },
          { text: "CORS", link: "/middleware/cors" },
          { text: "Error Handling", link: "/middleware/error-handler" },
        ],
      },
      {
        text: "Community",
        items: [{ text: "Roadmap & Contributions", link: "/community/build-together" }],
      },
      {
        text: "Reference",
        items: [{ text: "API Reference", link: "/api/index.html" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/bunwaylabs/bunway" },
      { icon: "npm", link: "https://www.npmjs.com/package/bunway" }
    ],
  },
});
