"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, LogIn, Mail, Shield } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

function buildUsernameCandidates(raw: string) {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (trimmed.includes("@")) {
    const local = trimmed.split("@")[0]?.trim();
    if (local && !candidates.includes(local)) candidates.push(local);
  }
  return candidates.filter(Boolean);
}

async function requestToken(username: string, password: string) {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const res = await fetch(`${API_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  let detail = "";
  try {
    const json = await res.json();
    detail = json?.detail || "";
    if (res.ok) return { ok: true as const, token: json.access_token as string };
  } catch {
    /* non-json */
  }

  return { ok: false as const, status: res.status, detail };
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.length > 0 && !loading,
    [username, password, loading],
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const candidates = buildUsernameCandidates(username);
    let lastDetail = "Incorrect username or password";

    try {
      for (const candidate of candidates) {
        const result = await requestToken(candidate, password);
        if (result.ok) {
          localStorage.setItem("token", result.token);
          router.push("/responses");
          return;
        }
        if (result.detail) lastDetail = String(result.detail);
        if (result.status && result.status >= 500) break;
      }
      setError(
        lastDetail === "Incorrect username or password"
          ? "Login failed. Check your email/username and password."
          : lastDetail,
      );
    } catch {
      setError(`Cannot reach the API at ${API_BASE_URL}. Start Survey backend (port 8002) and restart Next.js.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-login-screen ps-mesh-page-dark text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <div className="ps-login-brand relative z-10">
        <div className="max-w-xl">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
            <Shield className="h-8 w-8 text-white drop-shadow-sm" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            PulseSync <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Intelligence</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Real-time electoral intelligence, field reporting, and survey operations across wards and polling stations.
          </p>
        </div>
      </div>

      <div className="ps-login-form-wrap relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-lg"
        >
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
              <Shield className="h-7 w-7 text-white drop-shadow-sm" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              PulseSync <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Intelligence</span>
            </h1>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Admin Console Sign In
            </p>
          </div>

          <div className="ps-login-card p-8 text-slate-900">
            <h2 className="text-lg font-black text-slate-900 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-500 mb-6">
              Sign in to manage survey responses, wards, and field analytics.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Email or username
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin@iswot.io"
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-11 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border-0 bg-transparent p-2 text-slate-400 shadow-none hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="ps-login-btn flex w-full items-center justify-center gap-2 rounded-xl border-0 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-slate-400 leading-relaxed">
              API: <span className="font-mono text-slate-500">{API_BASE_URL}</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
