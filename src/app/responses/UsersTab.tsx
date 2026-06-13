"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

type SurveyUserRow = {
  id: number;
  username: string;
  display_name: string;
  mobile: string;
  created_at: string;
  disabled: boolean;
};

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

export default function UsersTab() {
  const [users, setUsers] = useState<SurveyUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/survey-users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json() as Promise<SurveyUserRow[]>;
      })
      .then((data) =>
        setUsers(
          Array.isArray(data)
            ? data.filter(
                (u) =>
                  u.display_name?.toLowerCase() !== "admin@iswot.io" &&
                  !u.username.toLowerCase().includes("admin_iswot") &&
                  !u.username.toLowerCase().startsWith("surveyor_admin"),
              )
            : [],
        ),
      )
      .catch(() => setError("Could not load survey users"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [users, query]);

  if (loading) {
    return <p className="ps-field-records-meta">Loading survey users…</p>;
  }

  if (error) {
    return <p className="ps-field-records-meta text-red-600">{error}</p>;
  }

  return (
    <div className="ps-users-tab">
      <div className="ps-field-records-toolbar">
        <div className="ps-field-records-toolbar-left">
          <span className="ps-field-records-label">Search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or mobile…"
            className="ps-users-search"
          />
          <span className="ps-field-records-count">{filtered.length} users</span>
        </div>
      </div>

      <p className="ps-field-records-meta">
        Field surveyors registered via sign-in. Admin accounts are not listed here.
      </p>

      <div className="ps-field-records-table-shell">
        <div className="ps-field-records-table-scroll">
          <table className="ps-field-records-table ps-users-table">
            <thead>
              <tr>
                <th scope="col"><span className="ps-th-label">Name</span></th>
                <th scope="col"><span className="ps-th-label">Mobile</span></th>
                <th scope="col"><span className="ps-th-label">Username</span></th>
                <th scope="col"><span className="ps-th-label">Registered</span></th>
                <th scope="col"><span className="ps-th-label">Status</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ps-field-records-empty">
                    No survey users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="ps-cell-text">{user.display_name || "—"}</span>
                    </td>
                    <td>
                      <span className="ps-cell-text">{user.mobile || "—"}</span>
                    </td>
                    <td>
                      <span className="ps-cell-text" title={user.username}>
                        {user.username}
                      </span>
                    </td>
                    <td>
                      <span className="ps-cell-text">{formatDate(user.created_at)}</span>
                    </td>
                    <td>
                      <span className={user.disabled ? "ps-field-records-badge is-muted" : "ps-field-records-badge is-live"}>
                        {user.disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
