"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  MapPinned,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import type { SurveyResponseRow } from "@/lib/surveyFieldKeys";
import SurveyCoverageMap, { type SurveyMapPoint } from "./SurveyCoverageMap";

type AnalysisView = "surveyor" | "ward";
type DisplayMode = "table" | "map";
type SortOption = "name" | "responses" | "latest";

type AggregateRow = {
  id: string;
  name: string;
  mobile: string;
  assembly: string;
  ward: string;
  responses: number;
  surveyors: number;
  gpsTagged: number;
  male: number;
  female: number;
  other: number;
  latest: string | null;
  points: SurveyResponseRow[];
};

const ALL_SCOPE = "__all__";
const UNASSIGNED_SCOPE = "__unassigned__";

function normalise(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function isLocationCaptured(row: SurveyResponseRow) {
  return Number.isFinite(row.latitude) && Number.isFinite(row.longitude);
}

function incrementGender(row: AggregateRow, gender: string | null) {
  const value = gender?.trim().toLowerCase() || "";
  if (value.startsWith("m")) row.male += 1;
  else if (value.startsWith("f")) row.female += 1;
  else row.other += 1;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatCoordinate(value: number | null) {
  return typeof value === "number" ? value.toFixed(5) : "-";
}

function scopeMatches(value: string | null | undefined, scope: string) {
  if (scope === ALL_SCOPE) return true;
  if (scope === UNASSIGNED_SCOPE) return !value?.trim();
  return value === scope;
}

function createSurveyorRows(rows: SurveyResponseRow[]): AggregateRow[] {
  const aggregated = new Map<string, AggregateRow>();

  rows.forEach((row) => {
    const name = normalise(row.surveyor_name, "Unassigned surveyor");
    const mobile = normalise(row.surveyor_mobile, "-");
    const id = `${name}::${mobile}`;
    const current = aggregated.get(id) ?? {
      id,
      name,
      mobile,
      assembly: "",
      ward: "",
      responses: 0,
      surveyors: 1,
      gpsTagged: 0,
      male: 0,
      female: 0,
      other: 0,
      latest: null,
      points: [],
    };
    current.responses += 1;
    current.gpsTagged += Number(isLocationCaptured(row));
    incrementGender(current, row.interviewer_gender);
    current.points.push(row);
    if (!current.latest || new Date(row.created_at).getTime() > new Date(current.latest).getTime()) {
      current.latest = row.created_at;
    }
    aggregated.set(id, current);
  });

  return Array.from(aggregated.values());
}

function createWardRows(rows: SurveyResponseRow[]): AggregateRow[] {
  const aggregated = new Map<string, AggregateRow>();

  rows.forEach((row) => {
    const assembly = normalise(row.assembly, "Unassigned assembly");
    const ward = normalise(row.gba_ward, "Unassigned ward");
    const id = `${assembly}::${ward}`;
    const current = aggregated.get(id) ?? {
      id,
      name: ward,
      mobile: "",
      assembly,
      ward,
      responses: 0,
      surveyors: 0,
      gpsTagged: 0,
      male: 0,
      female: 0,
      other: 0,
      latest: null,
      points: [],
    };
    current.responses += 1;
    current.gpsTagged += Number(isLocationCaptured(row));
    incrementGender(current, row.interviewer_gender);
    current.points.push(row);
    if (!current.latest || new Date(row.created_at).getTime() > new Date(current.latest).getTime()) {
      current.latest = row.created_at;
    }
    aggregated.set(id, current);
  });

  return Array.from(aggregated.values()).map((row) => ({
    ...row,
    surveyors: new Set(
      row.points.map((point) => `${normalise(point.surveyor_name, "Unassigned surveyor")}::${normalise(point.surveyor_mobile, "-")}`)
    ).size,
  }));
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function VolunteerAnalysisTab({ responses }: { responses: SurveyResponseRow[] }) {
  const [assembly, setAssembly] = useState(ALL_SCOPE);
  const [ward, setWard] = useState(ALL_SCOPE);
  const [view, setView] = useState<AnalysisView>("surveyor");
  const [sort, setSort] = useState<SortOption>("responses");
  const [mode, setMode] = useState<DisplayMode>("table");
  const [refreshKey, setRefreshKey] = useState(0);

  const assemblies = useMemo(
    () => Array.from(new Set(responses.map((row) => row.assembly?.trim()).filter(Boolean))) as string[],
    [responses]
  );
  const scopedByAssembly = useMemo(
    () => responses.filter((row) => scopeMatches(row.assembly, assembly)),
    [responses, assembly, refreshKey]
  );
  const wards = useMemo(
    () => Array.from(new Set(scopedByAssembly.map((row) => row.gba_ward?.trim()).filter(Boolean))) as string[],
    [scopedByAssembly]
  );
  const filteredResponses = useMemo(
    () => scopedByAssembly.filter((row) => scopeMatches(row.gba_ward, ward)),
    [scopedByAssembly, ward]
  );
  const rows = useMemo(() => {
    const values = view === "surveyor" ? createSurveyorRows(filteredResponses) : createWardRows(filteredResponses);
    return values.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "latest") return new Date(b.latest || 0).getTime() - new Date(a.latest || 0).getTime();
      return b.responses - a.responses || a.name.localeCompare(b.name);
    });
  }, [filteredResponses, view, sort]);
  const gpsPoints = useMemo(
    () => filteredResponses.filter(isLocationCaptured),
    [filteredResponses]
  );
  const mapPoints = useMemo<SurveyMapPoint[]>(() => gpsPoints.map((point) => ({
    id: point.id,
    name: normalise(point.interviewer_name, "Unnamed respondent"),
    surveyor: normalise(point.surveyor_name, "Unassigned surveyor"),
    assembly: normalise(point.assembly, "Unassigned assembly"),
    ward: normalise(point.gba_ward, "Unassigned ward"),
    gender: point.interviewer_gender,
    latitude: point.latitude as number,
    longitude: point.longitude as number,
    submittedAt: point.created_at,
  })), [gpsPoints]);
  const summary = useMemo(() => ({
    responses: filteredResponses.length,
    surveyors: new Set(filteredResponses.map((row) => `${normalise(row.surveyor_name, "Unassigned surveyor")}::${normalise(row.surveyor_mobile, "-")}`)).size,
    gpsTagged: gpsPoints.length,
    wards: new Set(filteredResponses.map((row) => row.gba_ward?.trim()).filter(Boolean)).size,
  }), [filteredResponses, gpsPoints]);

  const downloadCsv = () => {
    const heading = view === "surveyor"
      ? ["Surveyor", "Mobile", "Responses", "GPS Tagged", "Male", "Female", "Other", "Latest survey"]
      : ["Assembly", "Ward", "Responses", "Surveyors", "GPS Tagged", "Male", "Female", "Other", "Latest survey"];
    const data = rows.map((row) => view === "surveyor"
      ? [row.name, row.mobile, row.responses, row.gpsTagged, row.male, row.female, row.other, formatDate(row.latest)]
      : [row.assembly, row.ward, row.responses, row.surveyors, row.gpsTagged, row.male, row.female, row.other, formatDate(row.latest)]
    );
    const csv = [heading, ...data].map((line) => line.map(csvEscape).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `survey-volunteer-analysis-${view}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><BarChart3 className="h-4 w-4" /></span>
              <div>
                <h2 className="text-sm font-bold">Volunteer Analysis</h2>
                <p className="text-xs text-slate-500">Survey activity, respondent coverage and captured GPS locations.</p>
              </div>
            </div>
          </div>
          <button onClick={downloadCsv} className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
            <Download className="h-3.5 w-3.5" /> Download CSV
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="Assembly" value={assembly} onChange={(value) => { setAssembly(value); setWard(ALL_SCOPE); }}>
            <option value={ALL_SCOPE}>All Assemblies ({responses.length})</option>
            {assemblies.sort().map((item) => <option key={item} value={item}>{item} ({responses.filter((row) => row.assembly?.trim() === item).length})</option>)}
            {responses.some((row) => !row.assembly?.trim()) && <option value={UNASSIGNED_SCOPE}>Unassigned Assembly</option>}
          </FilterSelect>
          <FilterSelect label="Ward" value={ward} onChange={setWard} disabled={!wards.length && !scopedByAssembly.some((row) => !row.gba_ward?.trim())}>
            <option value={ALL_SCOPE}>All Wards ({scopedByAssembly.length})</option>
            {wards.sort().map((item) => <option key={item} value={item}>{item} ({scopedByAssembly.filter((row) => row.gba_ward?.trim() === item).length})</option>)}
            {scopedByAssembly.some((row) => !row.gba_ward?.trim()) && <option value={UNASSIGNED_SCOPE}>Unassigned Ward</option>}
          </FilterSelect>
          <FilterSelect label="View" value={view} onChange={(value) => setView(value as AnalysisView)}>
            <option value="surveyor">Surveyor wise</option>
            <option value="ward">Ward wise</option>
          </FilterSelect>
          <FilterSelect label="Sort by" value={sort} onChange={(value) => setSort(value as SortOption)}>
            <option value="responses">Most responses</option>
            <option value="name">Name A-Z</option>
            <option value="latest">Latest activity</option>
          </FilterSelect>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryCard label="Responses" value={summary.responses} icon={<BarChart3 className="h-4 w-4" />} color="indigo" />
          <SummaryCard label="Surveyors" value={summary.surveyors} icon={<Users className="h-4 w-4" />} color="sky" />
          <SummaryCard label="GPS tagged" value={summary.gpsTagged} icon={<MapPin className="h-4 w-4" />} color="emerald" />
          <SummaryCard label="Wards covered" value={summary.wards} icon={<MapPinned className="h-4 w-4" />} color="amber" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button onClick={() => setMode("table")} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold transition ${mode === "table" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Table</button>
          <button onClick={() => setMode("map")} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold transition ${mode === "map" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Map</button>
        </div>

        {mode === "table" ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white">
                <tr>
                  {view === "surveyor" ? <><Header>Surveyor</Header><Header>Mobile</Header></> : <><Header>Assembly</Header><Header>Ward</Header></>}
                  <Header>Responses</Header>
                  {view === "ward" && <Header>Surveyors</Header>}
                  <Header>GPS</Header><Header>Male</Header><Header>Female</Header><Header>Other</Header><Header>Latest survey</Header>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((row) => <tr key={row.id} className="hover:bg-slate-50">
                  {view === "surveyor" ? <><Cell strong>{row.name}</Cell><Cell>{row.mobile}</Cell></> : <><Cell>{row.assembly}</Cell><Cell strong>{row.ward}</Cell></>}
                  <Cell strong>{row.responses}</Cell>
                  {view === "ward" && <Cell>{row.surveyors}</Cell>}
                  <Cell><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{row.gpsTagged}</span></Cell>
                  <Cell>{row.male}</Cell><Cell>{row.female}</Cell><Cell>{row.other}</Cell><Cell>{formatDate(row.latest)}</Cell>
                </tr>)}
                {!rows.length && <tr><td colSpan={view === "surveyor" ? 9 : 10} className="px-4 py-10 text-center text-slate-500">No survey activity matches this selection.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h3 className="text-sm font-bold text-slate-900">Captured location coverage</h3><p className="text-xs text-slate-500">Click a marker to see the respondent, surveyor and submission details.</p></div>
              <button onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"><RefreshCw className="h-3.5 w-3.5" /> Refresh points</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Male</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />Female</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />Other / not recorded</span></div>
            <SurveyCoverageMap points={mapPoints} />
          </div>
        )}
      </div>
    </section>
  );
}

function FilterSelect({ label, value, onChange, children, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60">{children}</select></label>;
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: "indigo" | "sky" | "emerald" | "amber" }) {
  const styles = { indigo: "bg-indigo-50 text-indigo-700", sky: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-start justify-between"><span className="text-[11px] font-semibold text-slate-500">{label}</span><span className={`rounded-md p-1.5 ${styles[color]}`}>{icon}</span></div><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>;
}

function Header({ children }: { children: React.ReactNode }) { return <th className="whitespace-nowrap px-3 py-3 font-bold">{children}</th>; }
function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) { return <td className={`whitespace-nowrap px-3 py-3 ${strong ? "font-semibold text-slate-900" : ""}`}>{children}</td>; }
