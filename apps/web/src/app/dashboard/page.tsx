"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, type Application } from "@/lib/api";

const statuses = ["applied", "acknowledged", "screening", "interview", "decision", "silent", "closed"] as const;

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  applied: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  acknowledged: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  screening: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  interview: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  decision: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  silent: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  closed: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

const channels = ["LinkedIn", "Indeed", "Glassdoor", "Company Portal", "Email", "Referral", "Other"];

function StatusBadge({ status }: { status: string }) {
  const c = statusColors[status] ?? statusColors.applied;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function useApplications(user: { userId: string } | null) {
  const [apps, setApps] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(!!user);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    api.listApplications().then((data) => {
      if (!controller.signal.aborted) { setApps(data); setFetching(false); }
    }).catch(() => {
      if (!controller.signal.aborted) setFetching(false);
    });
    return () => controller.abort();
  }, [user]);

  const refresh = useCallback(async () => {
    const data = await api.listApplications();
    setApps(data);
  }, []);

  return { apps, fetching, refresh };
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { apps, fetching, refresh: loadApps } = useApplications(user);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [channel, setChannel] = useState(channels[0]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const filtered = useMemo(() => {
    let list = apps;
    if (filterStatus !== "all") list = list.filter((a) => a.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q),
      );
    }
    return list;
  }, [apps, filterStatus, search]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: apps.length };
    for (const s of statuses) m[s] = apps.filter((a) => a.status === s).length;
    return m;
  }, [apps]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError("");
    try {
      await api.createApplication({
        company: company.trim(),
        role: role.trim(),
        channel,
        appliedAt: new Date().toISOString().slice(0, 10),
        sourceUrl: sourceUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setCompany("");
      setRole("");
      setChannel(channels[0]);
      setSourceUrl("");
      setNotes("");
      setShowAddForm(false);
      await loadApps();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function handleStatusChange(appId: string, newStatus: string) {
    try {
      await api.updateApplication(appId, newStatus);
      setEditingId(null);
      await loadApps();
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(appId: string) {
    try {
      await api.deleteApplication(appId);
      await loadApps();
    } catch {
      /* ignore */
    }
  }

  if (loading || (!user && !fetching)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Top nav */}
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
        <span className="text-lg font-bold tracking-tight">JobVault</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--muted)]">{user?.name}</span>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--background)]"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={counts.all} />
          <StatCard label="Active" value={(counts.applied ?? 0) + (counts.acknowledged ?? 0) + (counts.screening ?? 0) + (counts.interview ?? 0)} accent="brand" />
          <StatCard label="Silent" value={counts.silent ?? 0} accent="danger" />
          <StatCard label="Closed" value={(counts.closed ?? 0) + (counts.decision ?? 0)} accent="success" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or role…"
              className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            >
              <option value="all">All statuses ({counts.all})</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s} ({counts[s] ?? 0})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Application
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="mb-4 font-semibold">New Application</h3>
            {addError && (
              <div className="mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
                {addError}
              </div>
            )}
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company *"
                className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
              <input
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role *"
                className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              >
                {channels.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Job URL (optional)"
                className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--background)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted)]">
              {apps.length === 0
                ? "No applications yet. Click \"Add Application\" to get started."
                : "No applications match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Role</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted)] sm:table-cell">Channel</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Status</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted)] md:table-cell">Applied</th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.appId} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)] transition">
                      <td className="px-4 py-3 font-medium">{app.company}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{app.role}</td>
                      <td className="hidden px-4 py-3 text-[var(--muted)] sm:table-cell">{app.channel}</td>
                      <td className="px-4 py-3">
                        {editingId === app.appId ? (
                          <select
                            defaultValue={app.status}
                            onChange={(e) => handleStatusChange(app.appId, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                            className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <button onClick={() => setEditingId(app.appId)} title="Click to change status">
                            <StatusBadge status={app.status} />
                          </button>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-[var(--muted)] md:table-cell">
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(app.appId)}
                          className="rounded px-2 py-1 text-xs text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
                          title="Delete application"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const colorMap: Record<string, string> = {
    brand: "text-[var(--brand)]",
    danger: "text-[var(--danger)]",
    success: "text-[var(--success)]",
  };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? colorMap[accent] ?? "" : ""}`}>{value}</p>
    </div>
  );
}
