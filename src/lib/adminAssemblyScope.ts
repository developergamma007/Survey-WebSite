import type { SurveyorProfile } from "@/lib/surveyorSession";

export type AssemblyPick = { assembly_no: number; assembly_name_en?: string | null };

export function isAssemblyScopedAdmin(profile: SurveyorProfile | null | undefined): boolean {
  if (!profile?.is_admin) return false;
  if (profile.is_platform_admin) return false;
  return profile.assembly_scope_no != null;
}

export function lockedAssemblyNo(profile: SurveyorProfile | null | undefined): number | null {
  if (!isAssemblyScopedAdmin(profile)) return null;
  return profile!.assembly_scope_no ?? null;
}

export function lockedAssemblyLabel(profile: SurveyorProfile | null | undefined): string | null {
  if (!isAssemblyScopedAdmin(profile)) return null;
  return (
    profile?.assembly_scope_name?.trim() ||
    (profile?.assembly_scope_no != null ? `Assembly ${profile.assembly_scope_no}` : null)
  );
}

export function filterAssembliesForAdmin<T extends AssemblyPick>(
  items: T[],
  profile: SurveyorProfile | null | undefined,
): T[] {
  const lock = lockedAssemblyNo(profile);
  if (lock == null) return items;
  return items.filter((row) => row.assembly_no === lock);
}

export function matchesLockedAssemblyName(
  assemblyLabel: string,
  profile: SurveyorProfile | null | undefined,
): boolean {
  const lockNo = lockedAssemblyNo(profile);
  const lockName = lockedAssemblyLabel(profile)?.toLowerCase() ?? "";
  if (lockNo == null) return true;
  const value = assemblyLabel.trim().toLowerCase();
  if (!value) return false;
  if (lockName && (value === lockName || value.includes(lockName))) return true;
  return value.includes(`(${lockNo})`) || value.includes(` ${lockNo}`);
}