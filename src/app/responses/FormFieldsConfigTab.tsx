"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/config";
import {
  DEFAULT_SURVEY_FIELD_CONFIG,
  mergeFieldConfig,
  SURVEYOR_FIELD_LABELS,
  VOTER_FIELD_LABELS,
  type SurveyFieldConfig,
} from "@/lib/surveyFieldConfig";

export default function FormFieldsConfigTab() {
  const [config, setConfig] = useState<SurveyFieldConfig>(DEFAULT_SURVEY_FIELD_CONFIG);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API_BASE_URL}/api/survey-form-config`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      .then((res) => setConfig(mergeFieldConfig(res.data)))
      .catch(() => setConfig(DEFAULT_SURVEY_FIELD_CONFIG));
  }, []);

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
      const res = await axios.put(`${API_BASE_URL}/api/survey-form-config`, config, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setConfig(mergeFieldConfig(res.data));
      setMessage("Saved form field settings.");
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
        <p className="text-sm text-slate-500">Choose which fields appear on web and mobile survey forms.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && <span className="text-sm font-semibold text-slate-600">{message}</span>}
      </div>
    </div>
  );
}
