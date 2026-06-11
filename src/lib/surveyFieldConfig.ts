export type SurveyFieldConfig = {
  surveyorFields: Record<string, boolean>;
  voterFields: Record<string, boolean>;
  enableVoterSearch: boolean;
  manualEntryWhenApiEmpty: boolean;
};

export const DEFAULT_SURVEY_FIELD_CONFIG: SurveyFieldConfig = {
  surveyorFields: {
    assembly: true,
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
  };
}

export const SURVEYOR_FIELD_LABELS: Record<string, string> = {
  assembly: "Assembly",
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
