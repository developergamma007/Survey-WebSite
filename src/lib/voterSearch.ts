import { digitsOnly } from "@/lib/mobileValidation";

export type VoterSuggestion = {
  name_en?: string;
  [key: string]: string | number | null | undefined;
};

export const pickVoterValue = (voter: VoterSuggestion, keys: string[]): string => {
  for (const key of keys) {
    const value = voter[key];
    if (value !== null && value !== undefined) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
};

export const normalizeOptionValue = (value: string, allowed: string[]): string => {
  if (!value) return "";
  const found = allowed.find((option) => option.toLowerCase() === value.toLowerCase());
  return found ?? "";
};

export const normalizeGender = (value: string): string => {
  const v = value.trim().toLowerCase();
  if (v === "m" || v === "male") return "Male";
  if (v === "f" || v === "female") return "Female";
  return normalizeOptionValue(value, ["Male", "Female", "Other"]);
};

export type VoterFormPatch = {
  interviewerName: string;
  interviewerAge: string;
  interviewerGender: string;
  interviewerCaste: string;
  interviewerCommunity: string;
  interviewerMobile: string;
  interviewerEducation: string;
  interviewerWork: string;
  interviewerCurrentAddress: string;
};

export function buildVoterFormPatch(voter: VoterSuggestion): VoterFormPatch {
  const age = pickVoterValue(voter, ["age", "voter_age", "interviewer_age"]);
  const gender = normalizeGender(pickVoterValue(voter, ["gender", "sex", "interviewer_gender"]));
  const caste = normalizeOptionValue(pickVoterValue(voter, ["caste", "interviewer_caste"]), [
    "Brahma",
    "Lingayat",
    "Vokkaliga",
    "Kuruba",
    "SC",
    "ST",
    "OBC",
    "Others",
  ]);
  const community = normalizeOptionValue(
    pickVoterValue(voter, ["community", "religion", "interviewer_community"]),
    ["Hindu", "Muslim", "Christian", "Jain", "Others"]
  );
  const education = normalizeOptionValue(
    pickVoterValue(voter, ["education", "qualification", "interviewer_education", "highest_qualification"]),
    ["Illiterate", "Primary", "Secondary", "Graduate", "Post-Graduate", "Others"]
  );
  const mobile = digitsOnly(
    pickVoterValue(voter, ["mobile", "phone", "mobile_no", "voter_mobile", "interviewer_mobile"])
  );

  const house = pickVoterValue(voter, ["house"]);
  const addressParts = [
    pickVoterValue(voter, ["address_en", "present_address", "family_address", "building_address"]),
    pickVoterValue(voter, ["address_local"]),
    house ? `House ${house}` : "",
  ].filter(Boolean);

  return {
    interviewerName: String(voter.name_en ?? ""),
    interviewerAge: age,
    interviewerGender: gender,
    interviewerCaste: caste,
    interviewerCommunity: community,
    interviewerMobile: mobile,
    interviewerEducation: education,
    interviewerWork: pickVoterValue(voter, ["job_type", "occupation", "work", "interviewer_work"]),
    interviewerCurrentAddress: addressParts.join(", "),
  };
}

export const formatRelationType = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Relation";
  if (normalized === "father") return "Father";
  if (normalized === "mother") return "Mother";
  if (normalized === "husband") return "Husband";
  if (normalized === "wife") return "Wife";
  if (normalized === "guardian") return "Guardian";
  return value;
};

export const buildVoterDetailLines = (voter: VoterSuggestion): string[] => {
  const lines: string[] = [];
  const ward = pickVoterValue(voter, ["ward_code", "ward_no"]);
  const booth = pickVoterValue(voter, ["booth_no", "booth"]);
  const serial = pickVoterValue(voter, ["sl", "sl_no", "serial_no"]);
  const house = pickVoterValue(voter, ["house"]);
  const gender = pickVoterValue(voter, ["gender"]);
  const age = pickVoterValue(voter, ["age", "voter_age"]);
  const relType = formatRelationType(pickVoterValue(voter, ["rel_type", "relation_type"]));
  const relEng = pickVoterValue(voter, ["rel_eng", "relation_name", "father_name", "mother_name", "guardian_name"]);
  const relKannada = pickVoterValue(voter, ["rel_kannada", "relation_name_kannada"]);
  const meta: string[] = [];

  if (relEng || relKannada) {
    lines.push(`${relType}: ${relEng || "-"} | ${relKannada || "-"}`);
  }
  if (ward) meta.push(`Ward ${ward}`);
  if (booth) meta.push(`Booth ${booth}`);
  if (serial) meta.push(`SL ${serial}`);
  if (house) meta.push(`House ${house}`);
  if (gender) meta.push(gender);
  if (age) meta.push(`Age ${age}`);
  if (meta.length) lines.push(meta.join(" | "));

  return lines;
};
