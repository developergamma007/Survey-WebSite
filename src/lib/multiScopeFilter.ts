/** Empty selection = no filter (all rows). UI shows every option as checked in that state. */

export const UNASSIGNED_ASSEMBLY_SCOPE = "__unassigned__";
export const UNASSIGNED_WARD_SCOPE = "__unassigned__";

export function multiSelectionIsAll(selection: string[], allValues: string[]): boolean {
  return selection.length === 0;
}

export function optionAppearsSelected(selection: string[], value: string): boolean {
  return selection.length === 0 || selection.includes(value);
}

/** Toggle the “All …” row: select everything (clear selection) or, if already all, leave all selected. */
export function toggleMultiAll(selection: string[], allValues: string[]): string[] {
  void allValues;
  if (selection.length === 0) {
    return [];
  }
  return [];
}

export function toggleMultiOption(selection: string[], value: string, allValues: string[]): string[] {
  if (selection.length === 0) {
    return allValues.filter((v) => v !== value);
  }
  if (selection.includes(value)) {
    const next = selection.filter((v) => v !== value);
    if (next.length === 0) {
      return [];
    }
    return next;
  }
  const next = [...selection, value];
  if (allValues.length > 0 && allValues.every((v) => next.includes(v))) {
    return [];
  }
  return next;
}

export function filterRowsByAssemblySelection<T>(
  rows: T[],
  selection: string[],
  getAssembly: (row: T) => string,
): T[] {
  if (selection.length === 0) return rows;
  return rows.filter((row) => {
    const asm = getAssembly(row)?.trim() || "";
    if (!asm) return selection.includes(UNASSIGNED_ASSEMBLY_SCOPE);
    return selection.includes(asm);
  });
}

export function filterRowsByWardSelection<T>(
  rows: T[],
  selection: string[],
  getWard: (row: T) => string,
): T[] {
  if (selection.length === 0) return rows;
  return rows.filter((row) => {
    const ward = getWard(row)?.trim() || "";
    if (!ward) return selection.includes(UNASSIGNED_WARD_SCOPE);
    return selection.includes(ward);
  });
}

export function multiFilterTriggerLabel(
  selection: string[],
  allLabel: string,
  options: { value: string; label: string }[],
): string {
  if (selection.length === 0) return allLabel;
  if (selection.length === 1) {
    const match = options.find((o) => o.value === selection[0]);
    return match?.label ?? selection[0];
  }
  return `${selection.length} selected`;
}

export function scopeFilterLabel(selection: string[], allLabel: string, options: { value: string; label: string }[]): string {
  if (selection.length === 0) return allLabel;
  if (selection.length === 1) {
    const v = selection[0];
    if (v === UNASSIGNED_ASSEMBLY_SCOPE) return "Unassigned Assembly";
    if (v === UNASSIGNED_WARD_SCOPE) return "Unassigned Ward";
    return v;
  }
  return `${selection.length} filters`;
}