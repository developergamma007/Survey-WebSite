"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Download, MapPin } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { FieldRecordAudio } from "@/components/FieldRecordAudio";
import WardFilterSelect from "./WardFilterSelect";
import { hasSurveyAudio } from "@/lib/audioRecording";
import {
  BASE_RECORD_COLUMNS,
  exportRecordsCsv,
  getRecordCellValue,
  type RecordColumn,
  type SurveyResponseRow,
} from "@/lib/surveyFieldKeys";
import { questionAnswerKey, questionColumnLabel } from "@/lib/surveyText";

const ROWS_PER_BATCH = 40;

type Ward = { id: number; ward_name_en: string };
type WardQuestion = { id: number; text: string; options: string };

type Props = {
  responses: SurveyResponseRow[];
};

function columnClassName(key: string, isDynamic?: boolean): string {
  if (key === "id") return "ps-col-narrow";
  if (key === "audio") return "ps-col-audio";
  if (key === "geotag") return "ps-col-geotag";
  if (key === "village" || key === "voter_of_constituency" || key === "polling_station" || isDynamic) {
    return "ps-col-wide";
  }
  return "";
}

const GEOTAG_COL_PX = 200;

const geotagCellStyle: CSSProperties = {
  width: GEOTAG_COL_PX,
  minWidth: GEOTAG_COL_PX,
  maxWidth: GEOTAG_COL_PX,
  paddingLeft: 16,
  paddingRight: 16,
  textAlign: "center",
  boxSizing: "border-box",
};

function columnWidthStyle(key: string): CSSProperties | undefined {
  if (key === "id") return { width: 80 };
  if (key === "audio") return { width: 300 };
  if (key === "geotag") return { width: GEOTAG_COL_PX };
  return undefined;
}

function cellStyle(key: string): CSSProperties | undefined {
  if (key === "geotag") return geotagCellStyle;
  return undefined;
}

function RecordCell({
  row,
  col,
}: {
  row: SurveyResponseRow;
  col: RecordColumn;
}) {
  if (col.key === "id") {
    return <span className="ps-cell-id">{row.id}</span>;
  }

  if (col.key === "audio") {
    return <FieldRecordAudio surveyId={row.id} hasAudio={hasSurveyAudio(row)} />;
  }

  if (col.key === "geotag") {
    if (row.latitude != null && row.longitude != null) {
      return (
        <div className="ps-geotag-wrap">
          <a
            href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ps-field-records-geotag"
          >
            <MapPin size={11} />
            Open
          </a>
        </div>
      );
    }
    return <span className="ps-cell-empty">—</span>;
  }

  const value = getRecordCellValue(row, col.key, col.legacyKeys);
  return value ? (
    <span className="ps-cell-text" title={value}>
      {value}
    </span>
  ) : (
    <span className="ps-cell-empty">—</span>
  );
}

export default function FieldRecordsTable({ responses }: Props) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [wardQuestions, setWardQuestions] = useState<WardQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_BATCH);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/wards`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWards(data);
      })
      .catch(() => setWards([]));
  }, []);

  useEffect(() => {
    if (!selectedWard) {
      setWardQuestions([]);
      return;
    }

    setLoadingQuestions(true);
    fetch(`${API_BASE_URL}/api/wards/${encodeURIComponent(selectedWard)}/questions`)
      .then((res) => res.json())
      .then((data) => {
        setWardQuestions(Array.isArray(data) ? data : []);
      })
      .catch(() => setWardQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, [selectedWard]);

  const dynamicColumns: RecordColumn[] = useMemo(() => {
    if (!selectedWard) return [];
    return wardQuestions.map((question) => {
      const key = questionAnswerKey(question.text);
      return {
        key,
        label: questionColumnLabel(question.text),
        isDynamic: true,
        legacyKeys: key !== question.text ? [question.text] : [],
      };
    });
  }, [selectedWard, wardQuestions]);

  const visibleColumns = useMemo(
    () => [...BASE_RECORD_COLUMNS, ...dynamicColumns],
    [dynamicColumns]
  );

  const filteredRows = useMemo(() => {
    if (!selectedWard) return responses;
    return responses.filter((row) => row.gba_ward === selectedWard);
  }, [responses, selectedWard]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  const hasMore = visibleCount < filteredRows.length;

  useEffect(() => {
    setVisibleCount(ROWS_PER_BATCH);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedWard, filteredRows.length]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + ROWS_PER_BATCH, filteredRows.length));
  }, [filteredRows.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visibleRows.length]);

  const handleExport = () => {
    const slug = selectedWard ? selectedWard.replace(/\s+/g, "-") : "all-wards";
    exportRecordsCsv(filteredRows, visibleColumns, `field-records-${slug}.csv`);
  };

  return (
    <div className="ps-field-records">
      <div className="ps-field-records-toolbar">
        <div className="ps-field-records-toolbar-left">
          <span className="ps-field-records-label">Ward</span>
          <WardFilterSelect
            wards={wards}
            value={selectedWard}
            onChange={setSelectedWard}
          />
          {loadingQuestions && selectedWard ? (
            <span className="ps-field-records-meta">Loading columns…</span>
          ) : null}
        </div>
        <button type="button" onClick={handleExport} className="ps-field-records-export">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <p className="ps-field-records-meta">
        {selectedWard
          ? `${selectedWard} — ${dynamicColumns.length} ward question column(s). Showing ${visibleRows.length} of ${filteredRows.length} rows.`
          : `All wards — ${visibleRows.length} of ${filteredRows.length} rows loaded. Select a ward for question columns.`}
      </p>

      <div className="ps-field-records-table-shell">
        <div ref={scrollRef} className="ps-field-records-table-scroll">
          <table className="ps-field-records-table">
            <colgroup>
              {visibleColumns.map((col) => (
                <col
                  key={col.key}
                  className={columnClassName(col.key, col.isDynamic)}
                  style={columnWidthStyle(col.key)}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    title={col.label}
                    className={columnClassName(col.key, col.isDynamic)}
                    style={cellStyle(col.key)}
                  >
                    <span className="ps-th-label">{col.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="ps-field-records-empty">
                    No records found for this filter.
                  </td>
                </tr>
              ) : (
                <>
                  {visibleRows.map((row) => (
                    <tr key={row.id}>
                      {visibleColumns.map((col) => (
                        <td
                          key={`${row.id}-${col.key}`}
                          className={columnClassName(col.key, col.isDynamic)}
                          style={cellStyle(col.key)}
                        >
                          <RecordCell row={row} col={col} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr ref={sentinelRef}>
                    <td
                      colSpan={visibleColumns.length}
                      className={`ps-field-records-load-more${hasMore ? "" : " is-done"}`}
                    >
                      {hasMore
                        ? `Scroll to load more (${visibleRows.length} / ${filteredRows.length})`
                        : `All ${filteredRows.length} records loaded`}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
