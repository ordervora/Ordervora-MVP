import path from "node:path";
import type { NextConfig } from "next";

const apiUrl =
  process.env.NODE_ENV === "production"
    ? "https://ordervora-api.onrender.com"
    : (process.env.API_URL ?? "http://localhost:4000");

const nextConfig: NextConfig = {
  // Production Hardening Phase 4 — emits .next/standalone, a self-contained
  // server.js + pruned node_modules for the container runtime stage
  // (apps/web/Dockerfile), so the final image doesn't need `next start` or
  // the full dependency tree. Skipped when building on Vercel (which sets
  // its own VERCEL env var): Vercel has its own serverless output pipeline
  // and doesn't run apps/web/Dockerfile at all, and "standalone" output is
  // unnecessary there — it doesn't need to be conditional for correctness
  // anywhere else, but leaving it on has caused build/tracing issues on
  // Vercel in the past for other Next.js monorepos.
  //
  // outputFileTracingRoot must still point at the pnpm workspace root in
  // both cases: this is a monorepo, so apps/web's own dependencies are
  // hoisted/symlinked into the root node_modules, not copied into
  // apps/web/node_modules — Vercel's own tracing needs this too.
  output: process.env.VERCEL ? undefined : "standalone",
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
