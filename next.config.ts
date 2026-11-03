import type { NextConfig } from "next";

const backendUrl = (process.env.API_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
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
