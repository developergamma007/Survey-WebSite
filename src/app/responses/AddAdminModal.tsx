"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

type AssemblyOption = { assembly_no: number; assembly_name_en: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  assemblies: AssemblyOption[];
  defaultAssemblyNo: string;
  scopeLocked?: boolean;
};

export default function AddAdminModal({
  open,
  onClose,
  onCreated,
  assemblies,
  defaultAssemblyNo,
  scopeLocked = false,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [assemblyNo, setAssemblyNo] = useState(defaultAssemblyNo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAssemblyNo(defaultAssemblyNo);
      setError(null);
    }
  }, [open, defaultAssemblyNo]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/survey-admins`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          mobile: mobile.trim(),
          username: username.trim().toLowerCase(),
          password,
          assembly_no: assemblyNo ? Number(assemblyNo) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not create admin");
      }
      setDisplayName("");
      setMobile("");
      setUsername("");
      setPassword("");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create admin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ps-admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-admin-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ps-admin-modal-head">
          <div>
            <h3 id="add-admin-title" className="ps-admin-modal-title">
              Add admin
            </h3>
            <p className="ps-admin-modal-sub">Create a responses dashboard login for your team.</p>
          </div>
          <button type="button" className="ps-admin-modal-close" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ps-admin-modal-body">
          <label className="ps-admin-modal-field">
            <span>Name</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full name" />
          </label>
          <label className="ps-admin-modal-field">
            <span>Mobile</span>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile"
              inputMode="numeric"
            />
          </label>
          <label className="ps-admin-modal-field">
            <span>Login email</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="name@example.com"
              autoComplete="username"
            />
          </label>
          <label className="ps-admin-modal-field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
          </label>
          <label className="ps-admin-modal-field">
            <span>Assembly scope</span>
            <select value={assemblyNo} onChange={(e) => setAssemblyNo(e.target.value)} disabled={scopeLocked}>
              <option value="">All assemblies</option>
              {assemblies.map((a) => (
                <option key={a.assembly_no} value={a.assembly_no}>
                  {a.assembly_name_en || `Assembly ${a.assembly_no}`} ({a.assembly_no})
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="ps-admin-modal-error">{error}</p> : null}
        </div>

        <div className="ps-admin-modal-foot">
          <button type="button" className="ps-admin-modal-btn is-muted" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="ps-admin-modal-btn is-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Add admin"}
          </button>
        </div>
      </div>
    </div>
  );
}