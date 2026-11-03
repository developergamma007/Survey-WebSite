"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/config";
import {
  DEFAULT_SURVEY_FIELD_CONFIG,
  buildFormConfigPutBody,
  mergeFieldConfig,
  SURVEYOR_FIELD_LABELS,
  VOTER_FIELD_LABELS,
  type SurveyFieldConfig,
} from "@/lib/surveyFieldConfig";

export default function FormFieldsConfigTab() {
  const [config, setConfig] = useState<SurveyFieldConfig>(DEFAULT_SURVEY_FIELD_CONFIG);
  const [assemblies, setAssemblies] = useState<Array<{ assembly_no: number; assembly_name_en: string | null }>>([]);
  const [wards, setWards] = useState<Array<{ id: number; ward_name_en: string }>>([]);
  const [assemblyNo, setAssemblyNo] = useState("");
  const [wardId, setWardId] = useState("");
  const [loadingScope, setLoadingScope] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resolvedFrom, setResolvedFrom] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<Array<{ assembly_no: number; assembly_name_en: string | null }>>(`${API_BASE_URL}/api/assemblies`)
      .then((res) => setAssemblies(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAssemblies([]));
  }, []);

  useEffect(() => {
    if (!assemblyNo) {
      setWards([]);
      setWardId("");
      return;
    }
    axios
      .get<Array<{ id: number; ward_name_en: string }>>(`${API_BASE_URL}/api/wards`, {
        params: { assembly_no: Number(assemblyNo) },
      })
      .then((res) => setWards(Array.isArray(res.data) ? res.data : []))
      .catch(() => setWards([]));
  }, [assemblyNo]);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      setLoadingScope(true);
      setMessage(null);
      setResolvedFrom(null);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get<SurveyFieldConfig>(`${API_BASE_URL}/api/survey-form-config`, {
          params: {
            ...(assemblyNo ? { assembly_no: Number(assemblyNo) } : {}),
            ...(wardId ? { ward_id: Number(wardId) } : {}),
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (cancelled) return;
        setConfig(mergeFieldConfig(res.data));
        setResolvedFrom(res.data.resolvedFrom ?? null);
      } catch {
        if (cancelled) return;
        setConfig(DEFAULT_SURVEY_FIELD_CONFIG);
        setResolvedFrom(null);
      } finally {
        if (!cancelled) setLoadingScope(false);
      }
    };
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [assemblyNo, wardId]);

  const selectAssembly = (value: string) => {
    setAssemblyNo(value);
    setWardId("");
  };

  const toggleSurveyor = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      surveyorFields: { ...prev.surveyorFields, [key]: !prev.surveyorFields[key] },
    }));
  };

  const toggleVoter = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      voterFields: { ...prev.voterFields, [key]: !prev.voterFields[key] },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_BASE_URL}/api/survey-form-config`,
        buildFormConfigPutBody(config, { assemblyNo, wardId }),
        {
          params: {
            ...(assemblyNo ? { assembly_no: Number(assemblyNo) } : {}),
            ...(wardId ? { ward_id: Number(wardId) } : {}),
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      setConfig(mergeFieldConfig(res.data));
      setResolvedFrom(wardId ? "ward" : assemblyNo ? "assembly" : "global");
      setMessage(wardId ? "Saved ward form field settings." : assemblyNo ? "Saved assembly form field settings." : "Saved global form field settings.");
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Form Field Settings</h2>
        <p className="text-sm text-slate-500">Choose which fields appear on web and mobile survey forms for the selected assembly or ward.</p>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="mb-3">
          <h3 className="font-bold text-slate-800">Configuration Scope</h3>
          <p className="text-sm text-slate-500">Ward settings override assembly settings. Global settings remain the fallback.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Assembly</span>
            <select value={assemblyNo} onChange={(event) => selectAssembly(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-800">
              <option value="">Global settings (all assemblies)</option>
              {assemblies.map((assembly) => (
                <option key={assembly.assembly_no} value={assembly.assembly_no}>
                  {assembly.assembly_name_en || `Assembly ${assembly.assembly_no}`} ({assembly.assembly_no})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Ward</span>
            <select value={wardId} onChange={(event) => setWardId(event.target.value)} disabled={!assemblyNo} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100">
              <option value="">Assembly settings (all wards)</option>
              {wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.ward_name_en}</option>)}
            </select>
          </label>
        </div>
        {resolvedFrom && !loadingScope && (
          <p className="mt-3 text-sm text-slate-600">
            {resolvedFrom === "ward" && "Showing saved settings for this ward."}
            {resolvedFrom === "assembly" &&
              "No ward-only save yet — showing assembly-wide settings (same for all wards in this assembly without their own save)."}
            {resolvedFrom === "global" &&
              "No ward or assembly save — showing global defaults."}
            {resolvedFrom === "defaults" && "Using built-in defaults (nothing saved yet)."}
          </p>
        )}
      </div>

      <div className={`grid md:grid-cols-2 gap-6 ${loadingScope ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="rounded-xl border border-slate-200 p-4 space-y-2">
          <h3 className="font-bold text-slate-800">Surveyor Information</h3>
          {Object.entries(SURVEYOR_FIELD_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.surveyorFields[key] ?? true}
                onChange={() => toggleSurveyor(key)}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 space-y-2">
          <h3 className="font-bold text-slate-800">Voter Demographics</h3>
          {Object.entries(VOTER_FIELD_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.voterFields[key] ?? true}
                onChange={() => toggleVoter(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={config.enableVoterSearch}
            onChange={() => setConfig((p) => ({ ...p, enableVoterSearch: !p.enableVoterSearch }))}
          />
          Enable voter search (when ward data exists)
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={config.manualEntryWhenApiEmpty}
            onChange={() => setConfig((p) => ({ ...p, manualEntryWhenApiEmpty: !p.manualEntryWhenApiEmpty }))}
          />
          Allow manual text entry when API lists are empty
        </label>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <span className="font-bold">Save will apply to: </span>
        {wardId ? (
          <>
            this ward only —{" "}
            <span className="font-semibold">
              {wards.find((w) => String(w.id) === wardId)?.ward_name_en ?? "Unknown ward"} (id {wardId})
            </span>
          </>
        ) : assemblyNo ? (
          <>
            <span className="font-semibold">all wards</span> in{" "}
            {assemblies.find((a) => String(a.assembly_no) === assemblyNo)?.assembly_name_en ?? "this assembly"} (
            {assemblyNo}) — wards without their own save inherit this
          </>
        ) : (
          <span className="font-semibold">every assembly (global default)</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || loadingScope}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : loadingScope ? "Loading settings..." : "Save Settings"}
        </button>
        {message && <span className="text-sm font-semibold text-slate-600">{message}</span>}
      </div>
    </div>
  );
}
