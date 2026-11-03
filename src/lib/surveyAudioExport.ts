import type { RecordColumn, SurveyResponseRow } from "@/lib/surveyFieldKeys";
import { getRecordCellValue } from "@/lib/surveyFieldKeys";
import { hasSurveyAudio } from "@/lib/audioRecording";

export const SURVEY_AUDIO_COLUMN_LABEL = "Survey audio";
export const SURVEY_AUDIO_DOWNLOAD_COLUMN_LABEL = "Survey audio download";

export function getAdminWebOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

export function buildSurveyAudioPlayUrl(surveyId: number, origin?: string): string {
  const base = (origin || getAdminWebOrigin()).replace(/\/$/, "");
  return `${base}/responses/audio/${surveyId}`;
}

export function buildSurveyAudioDownloadUrl(surveyId: number, origin?: string): string {
  return `${buildSurveyAudioPlayUrl(surveyId, origin)}?download=1`;
}

export function surveyAudioPortalLinks(
  row: SurveyResponseRow,
  origin?: string
): { play: string; download: string } | null {
  if (!hasSurveyAudio(row)) return null;
  const webOrigin = origin || getAdminWebOrigin();
  if (!webOrigin) return null;
  return {
    play: buildSurveyAudioPlayUrl(row.id, webOrigin),
    download: buildSurveyAudioDownloadUrl(row.id, webOrigin),
  };
}

function columnExportLabel(col: RecordColumn): string {
  if (col.key === "audio") return SURVEY_AUDIO_COLUMN_LABEL;
  return col.label;
}

function cellExportValue(
  row: SurveyResponseRow,
  col: RecordColumn,
  origin: string
): string {
  if (col.key === "audio") {
    const links = surveyAudioPortalLinks(row, origin);
    return links?.play ?? "Silent";
  }
  return getRecordCellValue(row, col.key, col.legacyKeys);
}

function escapeCsv(value: string): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportRecordsCsv(
  rows: SurveyResponseRow[],
  columns: RecordColumn[],
  filename = "field-records.csv",
  origin?: string
) {
  const webOrigin = origin || getAdminWebOrigin();
  const headers = [
    ...columns.map(columnExportLabel),
    SURVEY_AUDIO_DOWNLOAD_COLUMN_LABEL,
  ];
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => {
      const links = surveyAudioPortalLinks(row, webOrigin);
      const cells = columns.map((col) => escapeCsv(cellExportValue(row, col, webOrigin)));
      cells.push(escapeCsv(links?.download ?? ""));
      return cells.join(",");
    }),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/\.xlsx$/i, ".csv");
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportRecordsExcel(
  rows: SurveyResponseRow[],
  columns: RecordColumn[],
  filename = "field-records.xlsx",
  origin?: string
) {
  const XLSX = await import("xlsx");
  const webOrigin = origin || getAdminWebOrigin();
  const headers = [
    ...columns.map(columnExportLabel),
    SURVEY_AUDIO_DOWNLOAD_COLUMN_LABEL,
  ];

  const sheetRows: Record<string, string>[] = rows.map((row) => {
    const links = surveyAudioPortalLinks(row, webOrigin);
    const record: Record<string, string> = {};
    for (const col of columns) {
      const label = columnExportLabel(col);
      if (col.key === "audio") {
        record[label] = links ? "Play" : "Silent";
      } else {
        record[label] = getRecordCellValue(row, col.key, col.legacyKeys);
      }
    }
    record[SURVEY_AUDIO_DOWNLOAD_COLUMN_LABEL] = links ? "Download" : "";
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: headers });

  rows.forEach((row, rowIndex) => {
    const links = surveyAudioPortalLinks(row, webOrigin);
    if (!links) return;
    const excelRow = rowIndex + 1;

    columns.forEach((col, colIndex) => {
      if (col.key !== "audio") return;
      const cellAddress = XLSX.utils.encode_cell({ r: excelRow, c: colIndex });
      const cell = worksheet[cellAddress];
      if (!cell) return;
      cell.l = { Target: links.play, Tooltip: "Play survey audio (admin login required)" };
      cell.v = "Play";
      cell.t = "s";
    });

    const downloadCol = columns.length;
    const downloadAddress = XLSX.utils.encode_cell({ r: excelRow, c: downloadCol });
    const downloadCell = worksheet[downloadAddress];
    if (downloadCell) {
      downloadCell.l = {
        Target: links.download,
        Tooltip: "Download survey audio (admin login required)",
      };
      downloadCell.v = "Download";
      downloadCell.t = "s";
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Field records");
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
