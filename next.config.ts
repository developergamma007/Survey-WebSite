import type { NextConfig } from "next";

const backendUrl = (process.env.API_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/surveys", destination: `${backendUrl}/surveys` },
      { source: "/token", destination: `${backendUrl}/token` },
    ];
  },
};

export default nextConfig;
