const RESPONSES_ADMIN_USERNAME = "admin@iswot.io";

export function isResponsesAdmin(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === RESPONSES_ADMIN_USERNAME;
}

/** Legacy alias — only admin@iswot.io may use the responses dashboard / not submit surveys. */
export function isAdminSubmitter(username: string | null | undefined): boolean {
  return isResponsesAdmin(username);
}
