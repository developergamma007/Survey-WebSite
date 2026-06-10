const BLOCKED_SUBMITTER_USERNAMES = new Set(["admin", "admin@iswot.io"]);

export function isAdminSubmitter(username: string | null | undefined): boolean {
  if (!username) return false;
  const normalized = username.trim().toLowerCase();
  return BLOCKED_SUBMITTER_USERNAMES.has(normalized) || normalized.startsWith("admin@iswot");
}
