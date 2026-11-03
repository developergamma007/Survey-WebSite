export type WardLike = {
  id: number;
  ward_name_en: string | null;
  assembly_no?: number | null;
};

export type AssemblyLike = {
  assembly_no: number;
  assembly_name_en: string | null;
};

/** Decode ?ward= query values (handles accidental double-encoding). */
export function normalizeWardQueryParam(raw: string | null | undefined): string {
  let value = String(raw ?? "").trim();
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded.trim();
    } catch {
      break;
    }
  }
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function findWardByLinkedName(wards: WardLike[], linkedName: string): WardLike | undefined {
  const target = normalizeName(normalizeWardQueryParam(linkedName));
  if (!target) return undefined;

  return wards.find((ward) => normalizeName(ward.ward_name_en || "") === target);
}

export function assemblyLabelForWard(
  ward: WardLike | undefined,
  assemblies: AssemblyLike[]
): { assemblyNo: number; assemblyName: string } {
  const assemblyNo = ward?.assembly_no ?? 0;
  if (!assemblyNo) {
    return { assemblyNo: 0, assemblyName: "" };
  }
  const row = assemblies.find((item) => item.assembly_no === assemblyNo);
  const name = row?.assembly_name_en?.trim() || `Assembly ${assemblyNo}`;
  return { assemblyNo, assemblyName: name };
}
