/**
 * Frontend App Configuration
 *
 * API_BASE_URL is read from the environment variable NEXT_PUBLIC_API_BASE_URL.
 *
 * Environment files (Next.js auto-loads these):
 *   .env.local        → Local development (git-ignored)
 *   .env.development  → Development defaults
 *   .env.production   → Production defaults
 *
 * NOTE: All Next.js public env vars must be prefixed with NEXT_PUBLIC_
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/$/, "");
