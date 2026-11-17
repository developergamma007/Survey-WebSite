import type { SurveyResponseRow } from "@/lib/surveyFieldKeys";

/** Ward filter sentinel values (not real ward_name_en). */
export const FIELD_RECORDS_UNASSIGNED_ASSEMBLY = "__unassigned_assembly__";
export const FIELD_RECORDS_UNASSIGNED_WARD = "__unassigned_ward__";

export function isFieldRecordsRealWard(selectedWard: string): boolean {
  return (
    Boolean(selectedWard) &&
    selectedWard !== FIELD_RECORDS_UNASSIGNED_ASSEMBLY &&
    selectedWard !== FIELD_RECORDS_UNASSIGNED_WARD
  );
}

export function filterFieldRecordsByWard(
  responses: SurveyResponseRow[],
  selectedWard: string | string[],
): SurveyResponseRow[] {
  if (Array.isArray(selectedWard)) {
    return filterFieldRecordsByWards(responses, selectedWard);
  }
  if (!selectedWard) return responses;
  if (selectedWard === FIELD_RECORDS_UNASSIGNED_ASSEMBLY) {
    return responses.filter((row) => !row.assembly?.trim());
  }
  if (selectedWard === FIELD_RECORDS_UNASSIGNED_WARD) {
    return responses.filter((row) => !row.gba_ward?.trim());
  }
  return responses.filter((row) => row.gba_ward === selectedWard);
}

export function filterFieldRecordsByWards(
  responses: SurveyResponseRow[],
  selection: string[],
): SurveyResponseRow[] {
  if (!selection.length) return responses;
  return responses.filter((row) => {
    if (selection.includes(FIELD_RECORDS_UNASSIGNED_ASSEMBLY) && !row.assembly?.trim()) {
      return true;
    }
    if (selection.includes(FIELD_RECORDS_UNASSIGNED_WARD) && !row.gba_ward?.trim()) {
      return true;
    }
    const ward = row.gba_ward?.trim() || "";
    return Boolean(ward) && selection.includes(ward);
  });
}

export function singleFieldRecordsRealWard(selection: string[]): string | null {
  const real = selection.filter(isFieldRecordsRealWard);
  return real.length === 1 ? real[0] : null;
}

export function countUnassignedAssembly(responses: SurveyResponseRow[]): number {
  return responses.filter((row) => !row.assembly?.trim()).length;
}

export function countUnassignedWard(responses: SurveyResponseRow[]): number {
  return responses.filter((row) => !row.gba_ward?.trim()).length;
}