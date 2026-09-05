import type { NextConfig } from "next";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const apiOrigin = apiBaseUrl.startsWith("http")
  ? new URL(apiBaseUrl).origin
  : "http://localhost:3001";

// Wildcard host patterns for every current/legacy ngrok free-tier domain
// format, so `next dev` tunneled through ngrok (e.g. for testing on a phone,
// or sharing a login demo) isn't blocked by Next's dev-only cross-origin
// protections. Add a real reserved ngrok domain here too if the team starts
// using one instead of a random subdomain.
const ngrokDevOrigins = ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.io"];

const nextConfig: NextConfig = {
  // Dev server blocks cross-origin requests to dev-only assets/endpoints by
  // default (see next/dist/docs/.../allowedDevOrigins.md) — without this,
  // loading the app itself through a tunnel like ngrok can fail or warn.
  allowedDevOrigins: ngrokDevOrigins,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      // Server Actions (used directly by the login flow — see
      // src/app/login/actions.ts) compare the request's Origin header
      // against the server's own host and reject a mismatch as a CSRF
      // safeguard (next/dist/docs/.../serverActions.md). A tunneled origin
      // like https://<random>.ngrok-free.app never matches localhost, so
      // login (and every other Server Action) 403s through ngrok unless its
      // origin is allowlisted here.
      allowedOrigins: ngrokDevOrigins,
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
