import type { NextConfig } from "next";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const apiOrigin = apiBaseUrl.startsWith("http")
  ? new URL(apiBaseUrl).origin
  : "http://localhost:3001";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
