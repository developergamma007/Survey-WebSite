import { API_BASE_URL } from "@/lib/config";

export function buildUsernameCandidates(raw: string) {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (trimmed.includes("@")) {
    const local = trimmed.split("@")[0]?.trim();
    if (local && !candidates.includes(local)) candidates.push(local);
  }
  return candidates.filter(Boolean);
}

export async function requestSurveyorToken(username: string, password: string) {
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

export async function requestSurveyorLogin(displayName: string, mobile: string) {
  const res = await fetch(`${API_BASE_URL}/api/surveyor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: displayName.trim(),
      mobile: mobile.replace(/\D/g, ""),
    }),
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
