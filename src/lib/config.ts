/**
 * Frontend App Configuration
 *
 * Local dev: set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8002 in .env.local
 *
 * Production: leave NEXT_PUBLIC_API_BASE_URL empty (or unset). The app uses
 * same-origin requests and Next.js rewrites proxy to API_BACKEND_URL
 * (default http://127.0.0.1:8000 on the server).
 *
 * If a production build was accidentally baked with localhost in
 * NEXT_PUBLIC_API_BASE_URL, the browser guard below ignores it on real domains.
 */

const LOCAL_DEV_API = "http://127.0.0.1:8002";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLocalApiUrl(url: string): boolean {
  return /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(url);
}

export function getApiBaseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = isLocalHostname(host);

    if (!isLocal && fromEnv && isLocalApiUrl(fromEnv)) {
      return "";
    }

    if (fromEnv) return fromEnv;
    return isLocal ? LOCAL_DEV_API : "";
  }

  return fromEnv;
}

export const API_BASE_URL = getApiBaseUrl();
