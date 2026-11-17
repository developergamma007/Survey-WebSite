import { parseDynamicAnswers, type SurveyResponseRow } from "@/lib/surveyFieldKeys";

export type WardAssemblyRef = {
  ward_name_en: string | null;
  assembly_no: number | null;
};

export type AssemblyRef = {
  assembly_no: number;
  assembly_name_en: string | null;
};

/** Ward name → assembly label from master data (fixes rows saved with empty `assembly`). */
export function buildWardToAssemblyMap(
  wards: WardAssemblyRef[],
  assemblies: AssemblyRef[]
): Map<string, string> {
  const byNo = new Map(
    assemblies.map((row) => [
      row.assembly_no,
      row.assembly_name_en?.trim() || `Assembly ${row.assembly_no}`,
    ])
  );
  const map = new Map<string, string>();
  for (const ward of wards) {
    const name = ward.ward_name_en?.trim();
    if (!name || ward.assembly_no == null) continue;
    const assembly = byNo.get(ward.assembly_no);
    if (assembly) map.set(name, assembly);
  }
  return map;
}

/** Assembly used for admin filters (stored column, JSON fallback, ward master lookup). */
export function effectiveAssembly(
  row: SurveyResponseRow,
  wardToAssembly?: Map<string, string> | null
): string {
  const stored = row.assembly?.trim();
  if (stored) return stored;

  const dynamic = parseDynamicAnswers(row.dynamic_answers);
  const fromJson = dynamic.voter_of_constituency?.trim();
  if (fromJson) return fromJson;

  const ward = row.gba_ward?.trim();
  if (ward && wardToAssembly?.get(ward)) {
    return wardToAssembly.get(ward)!;
  }

  return "";
}