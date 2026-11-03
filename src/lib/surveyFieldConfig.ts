export type SurveyFieldConfig = {
  surveyorFields: Record<string, boolean>;
  voterFields: Record<string, boolean>;
  enableVoterSearch: boolean;
  manualEntryWhenApiEmpty: boolean;
  /** Present on admin loads: ward | assembly | global | defaults */
  resolvedFrom?: string | null;
};

export const DEFAULT_SURVEY_FIELD_CONFIG: SurveyFieldConfig = {
  surveyorFields: {
    ward: true,
    pollingStation: true,
    surveyorName: true,
    surveyorMobile: true,
  },
  voterFields: {
    interviewerName: true,
    interviewerAge: true,
    interviewerGender: true,
    interviewerCaste: true,
    interviewerCommunity: true,
    interviewerMobile: true,
    interviewerEducation: true,
    interviewerWork: true,
    interviewerHouseholdIncome: true,
    interviewerCurrentAddress: true,
    voterOfConstituency: true,
  },
  enableVoterSearch: true,
  manualEntryWhenApiEmpty: true,
};

export function mergeFieldConfig(raw: Partial<SurveyFieldConfig> | null | undefined): SurveyFieldConfig {
  return {
    surveyorFields: { ...DEFAULT_SURVEY_FIELD_CONFIG.surveyorFields, ...(raw?.surveyorFields ?? {}) },
    voterFields: { ...DEFAULT_SURVEY_FIELD_CONFIG.voterFields, ...(raw?.voterFields ?? {}) },
    enableVoterSearch: raw?.enableVoterSearch ?? DEFAULT_SURVEY_FIELD_CONFIG.enableVoterSearch,
    manualEntryWhenApiEmpty:
      raw?.manualEntryWhenApiEmpty ?? DEFAULT_SURVEY_FIELD_CONFIG.manualEntryWhenApiEmpty,
    resolvedFrom: raw?.resolvedFrom ?? null,
  };
}

/** PUT body: field flags + explicit save scope (ward / assembly / global). */
export function buildFormConfigPutBody(
  config: SurveyFieldConfig,
  scope: { assemblyNo: string; wardId: string },
): Record<string, unknown> {
  const { resolvedFrom: _ignored, ...fields } = config;
  return {
    ...fields,
    scope_assembly_no: scope.assemblyNo ? Number(scope.assemblyNo) : null,
    scope_ward_id: scope.wardId ? Number(scope.wardId) : null,
  };
}

export const SURVEYOR_FIELD_LABELS: Record<string, string> = {
  ward: "Ward",
  pollingStation: "Polling Station",
  surveyorName: "Surveyor Name",
  surveyorMobile: "Surveyor Mobile",
};

export const VOTER_FIELD_LABELS: Record<string, string> = {
  interviewerName: "Voter Name",
  interviewerAge: "Age",
  interviewerGender: "Gender",
  interviewerCaste: "Caste",
  interviewerCommunity: "Community",
  interviewerMobile: "Voter Mobile",
  interviewerEducation: "Education",
  interviewerWork: "Occupation",
  interviewerHouseholdIncome: "Household Income",
  interviewerCurrentAddress: "Current Address",
  voterOfConstituency: "Voter of Constituency",
};
