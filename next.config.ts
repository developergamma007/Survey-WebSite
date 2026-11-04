import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendUrl = (process.env.API_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      "",
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/surveys", destination: `${backendUrl}/surveys` },
      { source: "/token", destination: `${backendUrl}/token` },
    ];
  },
};

export default nextConfig;
