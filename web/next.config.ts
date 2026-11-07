import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  // ponytail: Cache Components hang on the Cloudflare Workers runtime; off for that build only
  cacheComponents: !process.env.CF_BUILD,
  partialPrefetching: !process.env.CF_BUILD,
  turbopack: {
    // web imports ../packages (shared chain + ENS); root must be the repo, not web/
    root: path.join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
