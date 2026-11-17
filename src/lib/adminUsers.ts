const RESPONSES_ADMIN_USERNAME = "admin@iswot.io";

type AdminProfileRef =
  | string
  | null
  | undefined
  | { username?: string | null; is_admin?: boolean };

export function isResponsesAdmin(profileOrUsername: AdminProfileRef, isAdmin?: boolean): boolean {
  if (typeof profileOrUsername === "object" && profileOrUsername !== null) {
    if (profileOrUsername.is_admin) return true;
    return isResponsesAdmin(profileOrUsername.username);
  }
  if (isAdmin === true) return true;
  const username = profileOrUsername;
  if (!username) return false;
  const normalized = username.trim().toLowerCase();
  return normalized === RESPONSES_ADMIN_USERNAME || normalized === "admin";
}

/** Legacy alias — only admin@iswot.io may use the responses dashboard / not submit surveys. */
export function isAdminSubmitter(username: string | null | undefined): boolean {
  return isResponsesAdmin(username);
}
