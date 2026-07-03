import path from "node:path";
import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Production Hardening Phase 4 — emits .next/standalone, a self-contained
  // server.js + pruned node_modules for the container runtime stage
  // (apps/web/Dockerfile), so the final image doesn't need `next start` or
  // the full dependency tree. outputFileTracingRoot must point at the
  // pnpm workspace root: this is a monorepo, so apps/web's own dependencies
  // are hoisted/symlinked into the root node_modules, not copied into
  // apps/web/node_modules — without this, trace-based copying would miss
  // them and standalone/server.js would fail to start.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      // The dashboard's preview iframe (§18) loads the API's renderer output
      // through this same-origin proxy — the rendered HTML's relative
      // /assets/... image URLs need the same treatment to resolve correctly
      // inside the iframe rather than against the dashboard's own origin.
      { source: "/preview/:path*", destination: `${apiUrl}/preview/:path*` },
      { source: "/assets/:path*", destination: `${apiUrl}/assets/:path*` },
    ];
  },
};

export default nextConfig;
