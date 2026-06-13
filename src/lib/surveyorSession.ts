import { API_BASE_URL } from "@/lib/config";
import { isResponsesAdmin } from "@/lib/adminUsers";

export type SurveyorProfile = {
  username: string;
  display_name: string;
  mobile: string;
  is_admin: boolean;
};

const TOKEN_KEY = "token";
const PROFILE_KEY = "surveyor_profile";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function loadCachedProfile(): SurveyorProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SurveyorProfile;
  } catch {
    return null;
  }
}

export function saveCachedProfile(profile: SurveyorProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearSurveyorSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export async function fetchSurveyorProfile(token: string): Promise<SurveyorProfile> {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    throw new Error("profile_fetch_failed");
  }
  return res.json() as Promise<SurveyorProfile>;
}

export async function restoreSurveyorSession(): Promise<SurveyorProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const profile = await fetchSurveyorProfile(token);
    saveCachedProfile(profile);
    return profile;
  } catch (err) {
    if (err instanceof Error && err.message === "unauthorized") {
      clearSurveyorSession();
    }
    return loadCachedProfile();
  }
}

export function isSurveyorAccount(profile: SurveyorProfile | null | undefined): boolean {
  if (!profile) return false;
  return !isResponsesAdmin(profile.username);
}

export function surveyorDefaults(profile: SurveyorProfile | null | undefined) {
  if (!isSurveyorAccount(profile)) {
    return { surveyorName: "", surveyorMobile: "" };
  }
  return {
    surveyorName: profile?.display_name?.trim() || "",
    surveyorMobile: profile?.mobile?.trim() || "",
  };
}
