import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
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
