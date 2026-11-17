import type { SurveyorProfile } from "@/lib/surveyorSession";

type AdminProfileRef =
  | string
  | null
  | undefined
  | { username?: string | null; is_admin?: boolean; is_platform_admin?: boolean };

export function isResponsesAdmin(profileOrUsername: AdminProfileRef, isAdmin?: boolean): boolean {
  if (typeof profileOrUsername === "object" && profileOrUsername !== null) {
    return Boolean(profileOrUsername.is_admin);
  }
  if (isAdmin === true) return true;
  return false;
}

/** Responses dashboard users — trust backend `is_admin` on the session profile. */
export function isAdminSubmitter(username: string | null | undefined): boolean {
  return isResponsesAdmin(username);
}

/** Survey audio — platform admin only (`is_platform_admin` from /api/me). */
export function canViewFieldRecordAudio(profile: SurveyorProfile | null | undefined): boolean {
  if (!profile || !isResponsesAdmin(profile)) return false;
  return Boolean(profile.is_platform_admin);
}
