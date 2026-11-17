import type { NextConfig } from "next";

// NEXUS is a local-first app: all data lives in the browser (IndexedDB),
// so the server-side caching features of Next.js are not needed here.
const nextConfig: NextConfig = {
  // Keep the dev indicator away from the sidebar footer buttons.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
