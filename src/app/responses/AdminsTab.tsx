"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Shield } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import AddAdminModal from "./AddAdminModal";
import { useAdminDashboardProfile } from "./AdminDashboardContext";
import {
  filterAssembliesForAdmin,
  isAssemblyScopedAdmin,
  lockedAssemblyNo,
} from "@/lib/adminAssemblyScope";

type SurveyAdminRow = {
  id: number;
  username: string;
  display_name: string;
  mobile: string;
  created_at: string;
  disabled: boolean;
  assembly_no: number | null;
  assembly_name: string | null;
  is_protected: boolean;
};

type AssemblyOption = { assembly_no: number; assembly_name_en: string | null };

const ALL_CONTEXT = "";

type SortMode = "latest" | "oldest" | "name-asc" | "name-desc";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function AdminsTab() {
  const adminProfile = useAdminDashboardProfile();
  const [admins, setAdmins] = useState<SurveyAdminRow[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [contextAssembly, setContextAssembly] = useState(ALL_CONTEXT);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadAdmins = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/survey-admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load admins");
      const data = (await res.json()) as SurveyAdminRow[];
      setAdmins(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
    fetch(`${API_BASE_URL}/api/assemblies`)
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setAssemblies(filterAssembliesForAdmin(rows, adminProfile));
      })
      .catch(() => setAssemblies([]));
  }, [loadAdmins, adminProfile]);

  useEffect(() => {
    const lock = lockedAssemblyNo(adminProfile);
    if (lock != null) {
      setContextAssembly(String(lock));
    }
  }, [adminProfile]);

  const scoped = useMemo(() => {
    if (!contextAssembly) return admins;
    const asmNo = Number(contextAssembly);
    return admins.filter(
      (row) => row.assembly_no == null || row.assembly_no === asmNo || row.is_protected,
    );
  }, [admins, contextAssembly]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = scoped;
    if (q) {
      rows = rows.filter(
        (a) =>
          a.display_name.toLowerCase().includes(q) ||
          a.username.toLowerCase().includes(q) ||
          a.mobile.includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      if (sortMode === "name-asc") return a.display_name.localeCompare(b.display_name);
      if (sortMode === "name-desc") return b.display_name.localeCompare(a.display_name);
      if (sortMode === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [scoped, query, sortMode]);

  const stats = useMemo(() => {
    return {
      total: scoped.length,
      active: scoped.filter((a) => !a.disabled).length,
      blocked: scoped.filter((a) => a.disabled).length,
    };
  }, [scoped]);

  const toggleBlocked = async (row: SurveyAdminRow) => {
    if (row.is_protected || row.id <= 0) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setActionId(row.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/survey-admins/${row.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disabled: !row.disabled }),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadAdmins();
    } catch {
      setError("Could not update admin status");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <p className="ps-field-records-meta">Loading admins…</p>;
  }

  return (
    <div className="ps-manage-admins">
      <div className="ps-manage-admins-head">
        <div className="ps-manage-admins-title-row">
          <span className="ps-manage-admins-icon">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <h2 className="ps-manage-admins-title">Manage Admins</h2>
            <p className="ps-manage-admins-sub">Responses dashboard logins and assembly scope.</p>
          </div>
        </div>
      </div>

      <div className="ps-manage-admins-context">
        <span className="ps-manage-admins-context-label">Context</span>
        <select
          value={contextAssembly}
          onChange={(e) => setContextAssembly(e.target.value)}
          disabled={isAssemblyScopedAdmin(adminProfile)}
          className="ps-manage-admins-context-select"
        >
          <option value="">All assemblies</option>
          {assemblies.map((a) => (
            <option key={a.assembly_no} value={a.assembly_no}>
              {a.assembly_name_en || `Assembly ${a.assembly_no}`} ({a.assembly_no})
            </option>
          ))}
        </select>
        <button type="button" className="ps-manage-admins-add" onClick={() => setModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add admin
        </button>
        <button type="button" className="ps-manage-admins-refresh" onClick={() => loadAdmins()} aria-label="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="ps-manage-admins-filters">
        <label className="ps-manage-admins-filter">
          <span>Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name / phone"
            className="ps-users-search"
          />
        </label>
        <label className="ps-manage-admins-filter">
          <span>Sort by</span>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="latest">Latest created</option>
            <option value="oldest">Oldest created</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>
        </label>
      </div>

      <div className="ps-manage-admins-stats">
        <span className="ps-manage-admins-stat is-total">Total: {stats.total}</span>
        <span className="ps-manage-admins-stat is-active">Active: {stats.active}</span>
        <span className="ps-manage-admins-stat is-blocked">Blocked: {stats.blocked}</span>
      </div>

      {error ? <p className="ps-field-records-meta text-red-600">{error}</p> : null}

      <ul className="ps-manage-admins-list">
        {filtered.length === 0 ? (
          <li className="ps-manage-admins-empty">No admins match this filter.</li>
        ) : (
          filtered.map((row) => {
            const blocked = row.disabled;
            const busy = actionId === row.id;
            return (
              <li key={`${row.id}-${row.username}`} className="ps-manage-admins-card">
                <div className="ps-manage-admins-avatar">{initials(row.display_name)}</div>
                <div className="ps-manage-admins-card-main">
                  <div className="ps-manage-admins-card-top">
                    <span className="ps-manage-admins-name">{row.display_name}</span>
                    <span className="ps-manage-admins-badge">{row.assembly_name || "All assemblies"}</span>
                    <span
                      className={
                        blocked ? "ps-manage-admins-badge is-blocked" : "ps-manage-admins-badge is-active"
                      }
                    >
                      {blocked ? "BLOCKED" : "ACTIVE"}
                    </span>
                    {row.is_protected ? (
                      <span className="ps-manage-admins-badge is-protected">PLATFORM</span>
                    ) : null}
                  </div>
                  <div className="ps-manage-admins-meta">
                    <span>{row.mobile || "—"}</span>
                    <span>·</span>
                    <span>{row.username}</span>
                    <span>·</span>
                    <span>{formatDate(row.created_at)}</span>
                  </div>
                </div>
                {!row.is_protected && row.id > 0 ? (
                  <button
                    type="button"
                    className={blocked ? "ps-manage-admins-action is-unblock" : "ps-manage-admins-action is-block"}
                    disabled={busy}
                    onClick={() => toggleBlocked(row)}
                  >
                    {busy ? "…" : blocked ? "Unblock" : "Block"}
                  </button>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <AddAdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadAdmins}
        assemblies={assemblies}
        defaultAssemblyNo={contextAssembly}
        scopeLocked={isAssemblyScopedAdmin(adminProfile)}
      />
    </div>
  );
}