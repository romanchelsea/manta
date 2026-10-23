import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents / partialPrefetching are intentionally off: the nonce-based
  // CSP in src/proxy.ts needs every page rendered per request, and the Next.js
  // CSP guide states Partial Prerendering is incompatible with nonces.
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
