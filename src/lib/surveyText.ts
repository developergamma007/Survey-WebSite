export function splitPipeText(text: string): { primary: string; secondary: string | null } {
  const parsed = splitQuestionText(text);
  return { primary: parsed.primary, secondary: parsed.secondary };
}

/** Parse: Kannada | English | field_key */
export function splitQuestionText(text: string): {
  primary: string;
  secondary: string | null;
  fieldKey: string | null;
} {
  const trimmed = String(text || "").trim();
  if (!trimmed) return { primary: "", secondary: null, fieldKey: null };

  const parts = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const fieldKey = parts[parts.length - 1];
    const secondary = parts[parts.length - 2];
    const primary = parts.slice(0, -2).join(" | ");
    return { primary, secondary, fieldKey };
  }

  if (parts.length === 2) {
    return { primary: parts[0], secondary: parts[1], fieldKey: null };
  }

  return { primary: trimmed, secondary: null, fieldKey: null };
}

export function questionAnswerKey(text: string): string {
  const { fieldKey } = splitQuestionText(text);
  return fieldKey || text;
}

export function questionColumnLabel(text: string): string {
  const { primary, secondary, fieldKey } = splitQuestionText(text);
  if (secondary && fieldKey) {
    return `${primary} | ${secondary} | ${fieldKey}`;
  }
  if (secondary) return `${primary} | ${secondary}`;
  return primary || text;
}

export type QuestionFieldType = "choice" | "text";

export type ParsedQuestionConfig =
  | { type: "choice"; options: string[] }
  | { type: "text"; fields: string[] };

export function parseQuestionConfig(options: string): ParsedQuestionConfig {
  const raw = String(options || "").trim();
  if (!raw) {
    return { type: "choice", options: [] };
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { type?: string; fields?: string[]; values?: string[] };
      if (parsed.type === "text" && Array.isArray(parsed.fields)) {
        return {
          type: "text",
          fields: parsed.fields.map((field) => String(field).trim()).filter(Boolean),
        };
      }
      if (parsed.type === "choice" && Array.isArray(parsed.values)) {
        return {
          type: "choice",
          options: parsed.values.map((value) => String(value).trim()).filter(Boolean),
        };
      }
    } catch {
      // Fall through to legacy format.
    }
  }

  return {
    type: "choice",
    options: raw
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean),
  };
}

export function serializeChoiceQuestion(options: string[]): string {
  return JSON.stringify({
    type: "choice",
    values: options.map((opt) => opt.trim()).filter(Boolean),
  });
}

export function serializeTextQuestion(fields: string[]): string {
  return JSON.stringify({
    type: "text",
    fields: fields.map((field) => field.trim()).filter(Boolean),
  });
}

export function parseQuestionOptions(options: string): string[] {
  const config = parseQuestionConfig(options);
  return config.type === "choice" ? config.options : [];
}

export function parseTextQuestionFields(questionText: string, value: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // ignore
  }
  return { [questionText]: value };
}

export function readTextAnswer(answers: Record<string, string>, questionText: string, field: string): string {
  const raw = answers[questionText];
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[field] || "";
  } catch {
    return field === "response" ? raw : "";
  }
}

export function writeTextAnswer(
  answers: Record<string, string>,
  questionText: string,
  field: string,
  value: string
): Record<string, string> {
  const existing = readTextAnswerMap(answers, questionText);
  existing[field] = value;
  return { ...answers, [questionText]: JSON.stringify(existing) };
}

export function readTextAnswerMap(answers: Record<string, string>, questionText: string): Record<string, string> {
  const raw = answers[questionText];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    return { response: raw };
  }
  return {};
}

/** Internal key when admin did not define a field label. */
export const GENERIC_TEXT_FIELD_KEY = "__value";

export function defaultTextFieldTemplates(fields: string[]): string[] {
  const labels = fields.map((field) => field.trim()).filter(Boolean);
  return labels.length ? labels : [GENERIC_TEXT_FIELD_KEY];
}

export function isGenericTextFieldKey(field: string): boolean {
  return field === GENERIC_TEXT_FIELD_KEY;
}

export function emptyTextAnswerRow(fieldTemplates: string[]): Record<string, string> {
  return Object.fromEntries(fieldTemplates.map((field) => [field, ""]));
}

function normalizeTextAnswerRow(
  row: Record<string, string>,
  fieldTemplates: string[]
): Record<string, string> {
  const templates = defaultTextFieldTemplates(fieldTemplates);
  const base = { ...emptyTextAnswerRow(templates), ...row };
  if (
    templates.length === 1 &&
    isGenericTextFieldKey(templates[0]) &&
    row.Response &&
    !row[GENERIC_TEXT_FIELD_KEY]
  ) {
    base[GENERIC_TEXT_FIELD_KEY] = row.Response;
    delete base.Response;
  }
  return base;
}

/** Parse repeatable input-field answers (supports legacy single-row objects). */
export function parseTextAnswerRows(
  raw: string | undefined,
  fieldTemplates: string[]
): Array<Record<string, string>> {
  const templates = defaultTextFieldTemplates(fieldTemplates);
  if (!raw) return [emptyTextAnswerRow(templates)];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [emptyTextAnswerRow(templates)];
      if (typeof parsed[0] === "string") {
        const label = templates[0];
        return (parsed as string[]).map((value) => ({ [label]: value }));
      }
      if (parsed[0] && typeof parsed[0] === "object") {
        return (parsed as Array<Record<string, string>>).map((row) =>
          normalizeTextAnswerRow(row, fieldTemplates)
        );
      }
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (Array.isArray(record.__rows)) {
        const rows = record.__rows as Array<Record<string, string>>;
        return rows.length
          ? rows.map((row) => normalizeTextAnswerRow(row, fieldTemplates))
          : [emptyTextAnswerRow(templates)];
      }
      return [normalizeTextAnswerRow(record as Record<string, string>, fieldTemplates)];
    }
  } catch {
    return [{ [templates[0]]: raw }];
  }

  return [emptyTextAnswerRow(templates)];
}

/** Persist all rows (including empty) so Add/Remove works while editing. */
export function serializeTextAnswerRows(rows: Array<Record<string, string>>): string {
  return JSON.stringify({
    __rows: rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, String(value).trim()])
      )
    ),
  });
}

/** Drop blank entries before survey submit. */
export function compactStoredTextAnswer(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { __rows?: Array<Record<string, string>> };
    if (!Array.isArray(parsed.__rows)) return raw;
    const cleaned = parsed.__rows
      .map((row) =>
        Object.fromEntries(
          Object.entries(row)
            .map(([key, value]) => [key, String(value).trim()])
            .filter(([, value]) => value)
        )
      )
      .filter((row) => Object.keys(row).length > 0);
    return cleaned.length ? JSON.stringify({ __rows: cleaned }) : "";
  } catch {
    return raw.trim();
  }
}

export function formatStoredTextAnswer(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === "string") {
        return (parsed as string[]).filter(Boolean).join(" | ");
      }
      return (parsed as Array<Record<string, string>>)
        .map((row) =>
          Object.entries(row)
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ")
        )
        .filter(Boolean)
        .join(" | ");
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (Array.isArray(record.__rows)) {
        return (record.__rows as Array<Record<string, string>>)
          .map((row) =>
            Object.entries(row)
              .filter(([, value]) => value)
              .map(([key, value]) =>
                isGenericTextFieldKey(key) ? value : `${key}: ${value}`
              )
              .join(", ")
          )
          .filter(Boolean)
          .join(" | ");
      }
      return Object.entries(record as Record<string, string>)
        .filter(([, value]) => value)
        .map(([key, value]) =>
          isGenericTextFieldKey(key) ? value : `${key}: ${value}`
        )
        .join(" | ");
    }
  } catch {
    return raw;
  }
  return raw;
}
