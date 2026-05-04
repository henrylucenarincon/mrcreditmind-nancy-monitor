import type { NextConfig } from "next";

const internalHtmlNoStoreHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, no-cache, max-age=0, must-revalidate",
  },
  {
    key: "CDN-Cache-Control",
    value: "no-store",
  },
  {
    key: "Surrogate-Control",
    value: "no-store",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/",
        headers: internalHtmlNoStoreHeaders,
      },
      {
        source: "/login",
        headers: internalHtmlNoStoreHeaders,
      },
      {
        source: "/select",
        headers: internalHtmlNoStoreHeaders,
      },
      {
        source: "/copilot",
        headers: internalHtmlNoStoreHeaders,
      },
      {
        source: "/copilot/:path*",
        headers: internalHtmlNoStoreHeaders,
      },
      {
        source: "/ops",
        headers: internalHtmlNoStoreHeaders,
      },
      {
        source: "/ops/:path*",
        headers: internalHtmlNoStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
