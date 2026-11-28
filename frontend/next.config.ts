import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "172.20.10.2",
    "172.20.10.*",
    "192.168.*.*",
    "10.*.*.*",
    "172.23.240.1",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Same-origin proxy to the FastAPI backend (codebase/web/server.py), so its cookies work as first-party.
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/cal/:path*", destination: `${backend}/cal/:path*` },
      { source: "/docs", destination: `${backend}/docs` },
      { source: "/openapi.json", destination: `${backend}/openapi.json` },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
