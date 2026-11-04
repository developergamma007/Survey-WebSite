import {
  getRecordCellValue,
  parseDynamicAnswers,
  SURVEY_META_KEYS,
  type SurveyResponseRow,
} from "@/lib/surveyFieldKeys";
import { questionAnswerKey, questionColumnLabel, type ParsedQuestionConfig, parseQuestionConfig } from "@/lib/surveyText";

/** Stored in dynamic JSON but not ward survey questions. */
export const ANALYTICS_STATIC_ANSWER_KEYS = new Set([
  "team_code",
  "au_name",
  "voter_of_constituency",
  "village",
  "name",
  "mobile",
  "gender",
  "age",
  "highest_qualification",
  "religion",
  "caste_list",
  "job_type",
  "household_income",
  "current_address",
  "polling_station",
]);

export type AnalyticsQuestion = {
  key: string;
  label: string;
  config: ParsedQuestionConfig;
  legacyKeys?: string[];
};

export type DistributionSlice = { name: string; value: number };

export function isAnalyticsMetaKey(key: string): boolean {
  return key === SURVEY_META_KEYS.startedAt || key === SURVEY_META_KEYS.endedAt || key.startsWith("_");
}

export function discoverQuestionKeys(rows: SurveyResponseRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const dynamic = parseDynamicAnswers(row.dynamic_answers);
    for (const key of Object.keys(dynamic)) {
      if (isAnalyticsMetaKey(key) || ANALYTICS_STATIC_ANSWER_KEYS.has(key)) continue;
      keys.add(key);
    }
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export function questionsFromWardApi(
  wardQuestions: Array<{ text: string; options: string }>
): AnalyticsQuestion[] {
  return wardQuestions.map((question) => {
    const key = questionAnswerKey(question.text);
    return {
      key,
      label: questionColumnLabel(question.text),
      config: parseQuestionConfig(question.options),
      legacyKeys: key !== question.text ? [question.text] : undefined,
    };
  });
}

export function mergeLegacyQuestionKeys(questions: AnalyticsQuestion[], rows: SurveyResponseRow[]): AnalyticsQuestion[] {
  const byKey = new Map(questions.map((q) => [q.key, q]));
  const legacy: AnalyticsQuestion[] = [];
  for (let i = 1; i <= 4; i += 1) {
    const key = `q${i}` as const;
    const hasAny = rows.some((row) => {
      const v = row[key];
      return typeof v === "string" && v.trim().length > 0;
    });
    if (hasAny && !byKey.has(key)) {
      legacy.push({
        key,
        label: `Legacy question ${i}`,
        config: { type: "choice", options: [] },
      });
    }
  }
  return [...questions, ...legacy.filter((q) => !byKey.has(q.key))];
}

function readLegacyAnswer(row: SurveyResponseRow, key: string): string | null {
  if (key === "q1" || key === "q2" || key === "q3" || key === "q4") {
    const v = row[key];
    return v?.trim() || null;
  }
  return null;
}

export function answerForQuestion(row: SurveyResponseRow, key: string, legacyKeys: string[] = []): string | null {
  const legacy = readLegacyAnswer(row, key);
  if (legacy) return legacy;
  const value = getRecordCellValue(row, key, legacyKeys);
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") && trimmed.includes('"')) {
    return null;
  }
  return trimmed;
}

export function buildDistribution(
  rows: SurveyResponseRow[],
  question: AnalyticsQuestion,
  maxSlices = 10
): DistributionSlice[] {
  const counts: Record<string, number> = {};
  const legacyKeys = question.legacyKeys ?? [];

  for (const row of rows) {
    const raw = answerForQuestion(row, question.key, legacyKeys);
    if (!raw) continue;
    const name =
      raw.length > 48 ? `${raw.slice(0, 45).trim()}…` : raw.charAt(0).toUpperCase() + raw.slice(1);
    counts[name] = (counts[name] || 0) + 1;
  }

  const sorted = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= maxSlices) return sorted;

  const head = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.value, 0);
  if (rest > 0) head.push({ name: "Other", value: rest });
  return head;
}

export function buildFieldDistribution(
  rows: SurveyResponseRow[],
  readValue: (row: SurveyResponseRow) => string | null | undefined,
  maxSlices = 8
): DistributionSlice[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const raw = readValue(row)?.trim();
    if (!raw) continue;
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    counts[name] = (counts[name] || 0) + 1;
  }
  const sorted = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= maxSlices) return sorted;
  const head = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.value, 0);
  if (rest > 0) head.push({ name: "Other", value: rest });
  return head;
}

export function shouldRenderQuestionChart(
  question: AnalyticsQuestion,
  slices: DistributionSlice[]
): boolean {
  if (slices.length === 0) return false;
  if (question.config.type === "text") return false;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return false;
  return true;
}
