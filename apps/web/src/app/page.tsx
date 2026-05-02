"use client";

import { FormEvent, useMemo, useState } from "react";

type Status = "applied" | "acknowledged" | "screening" | "interview" | "decision" | "silent" | "closed";

interface ApplicationItem {
  id: string;
  company: string;
  role: string;
  channel: string;
  appliedAt: string;
  status: Status;
  silenceDays: number;
  followupsSent: number;
}

interface AllowlistRule {
  id: string;
  type: "domain" | "sender";
  value: string;
}

interface IngestionLog {
  id: string;
  sender: string;
  subject: string;
  status: "parsed" | "needs_confirmation" | "discarded_not_allowlisted";
}

const statusOrder: Status[] = ["applied", "acknowledged", "screening", "interview", "decision", "silent", "closed"];

const templates = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Company Portal",
  "Email Outreach",
  "Referral",
  "Other",
];

const seededApps: ApplicationItem[] = [
  {
    id: "app-1",
    company: "Stripe",
    role: "Software Engineer II",
    channel: "LinkedIn",
    appliedAt: "2026-04-02",
    status: "silent",
    silenceDays: 19,
    followupsSent: 1,
  },
  {
    id: "app-2",
    company: "Canva",
    role: "Frontend Engineer",
    channel: "Company Portal",
    appliedAt: "2026-04-10",
    status: "interview",
    silenceDays: 0,
    followupsSent: 0,
  },
];

export default function Home() {
  const [applications, setApplications] = useState<ApplicationItem[]>(seededApps);
  const [allowlist, setAllowlist] = useState<AllowlistRule[]>([
    { id: "allow-1", type: "domain", value: "@greenhouse.io" },
    { id: "allow-2", type: "sender", value: "careers@stripe.com" },
  ]);
  const [ingestionLog, setIngestionLog] = useState<IngestionLog[]>([
    {
      id: "ing-1",
      sender: "jobs@greenhouse.io",
      subject: "Application received",
      status: "parsed",
    },
    {
      id: "ing-2",
      sender: "talent@startup.example",
      subject: "Quick update",
      status: "needs_confirmation",
    },
  ]);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [template, setTemplate] = useState(templates[0]);
  const [csvInput, setCsvInput] = useState("company,role,channel,appliedAt\nExample Inc,Backend Engineer,LinkedIn,2026-04-20");
  const [allowlistType, setAllowlistType] = useState<"domain" | "sender">("domain");
  const [allowlistValue, setAllowlistValue] = useState("");
  const [selectedAppId, setSelectedAppId] = useState(seededApps[0].id);
  const [tone, setTone] = useState<"warm" | "neutral" | "brief">("neutral");
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [followupDraft, setFollowupDraft] = useState(
    "Hello, I am following up on my application. Could you share any update when convenient?",
  );

  const selectedApplication = applications.find((item) => item.id === selectedAppId);
  const silentCount = applications.filter((item) => item.status === "silent").length;

  const statusBuckets = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      items: applications.filter((item) => item.status === status),
    }));
  }, [applications]);

  function addApplication(event: FormEvent) {
    event.preventDefault();
    if (!company.trim() || !role.trim()) return;
    setApplications((current) => [
      {
        id: crypto.randomUUID(),
        company: company.trim(),
        role: role.trim(),
        channel: template,
        appliedAt: new Date().toISOString().slice(0, 10),
        status: "applied",
        silenceDays: 0,
        followupsSent: 0,
      },
      ...current,
    ]);
    setCompany("");
    setRole("");
  }

  function addAllowlistRule(event: FormEvent) {
    event.preventDefault();
    if (!allowlistValue.trim()) return;
    setAllowlist((rules) => [
      ...rules,
      {
        id: crypto.randomUUID(),
        type: allowlistType,
        value: allowlistValue.trim(),
      },
    ]);
    setAllowlistValue("");
  }

  function importCsvRows() {
    const [header, ...rows] = csvInput.trim().split("\n");
    if (!header || rows.length === 0) return;

    const normalizedRows = rows
      .map((line) => line.split(",").map((value) => value.trim()))
      .filter((parts) => parts.length >= 4)
      .map(([csvCompany, csvRole, csvChannel, csvDate]) => ({
        id: crypto.randomUUID(),
        company: csvCompany,
        role: csvRole,
        channel: csvChannel,
        appliedAt: csvDate,
        status: "applied" as Status,
        silenceDays: 0,
        followupsSent: 0,
      }));

    setApplications((current) => [...normalizedRows, ...current]);
  }

  function confirmIngestion(ingestionId: string) {
    setIngestionLog((logs) =>
      logs.map((entry) =>
        entry.id === ingestionId
          ? { ...entry, status: "parsed" }
          : entry,
      ),
    );
  }

  function createFollowupDraft() {
    if (!selectedApplication) return;
    const intros: Record<"warm" | "neutral" | "brief", string> = {
      warm: "Hi there,\n\nI hope you are doing well.",
      neutral: "Hello,",
      brief: "Hello,",
    };
    const endings: Record<"warm" | "neutral" | "brief", string> = {
      warm: "Thank you for your time and consideration.",
      neutral: "Thank you.",
      brief: "Thanks.",
    };
    setFollowupDraft(
      `${intros[tone]}\n\nI wanted to follow up on my ${selectedApplication.role} application at ${selectedApplication.company}, submitted on ${selectedApplication.appliedAt}. I remain interested in the role and would appreciate any update on timeline or next steps.\n\n${endings[tone]}`,
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden bg-[radial-gradient(circle_at_25%_20%,#e6f2ef_0,#cfe6e1_33%,#a9d2ca_68%,#8dbfb4_100%)] px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2d4f4a]">Job Application Tracker</p>
          <h1 className="headline max-w-3xl text-4xl leading-tight sm:text-5xl">
            You applied. Now breathe. Keep every application visible and follow up responsibly.
          </h1>
          <p className="max-w-2xl text-lg text-[#2d4f4a]">
            Unified observability across channels, honest silence signals, and bounded communication support from your own mailbox.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#capture"
              className="rounded-full bg-[#205952] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#184740]"
            >
              Log Application
            </a>
            <a
              href="#followup"
              className="rounded-full border border-[#205952] px-5 py-3 text-sm font-semibold text-[#205952] transition hover:bg-[#205952] hover:text-white"
            >
              Draft Follow-up
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10 sm:px-10 lg:px-16">
        <section id="capture" className="rounded-3xl border border-[var(--border)] bg-surface p-6">
          <h2 className="headline text-3xl">Manual capture with quick templates</h2>
          <p className="mt-2 text-[var(--muted)]">Fast logging for LinkedIn, Indeed, Glassdoor, portals, referral, and other channels.</p>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addApplication}>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Company"
              className="rounded-xl border border-[var(--border)] px-3 py-2"
            />
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Role"
              className="rounded-xl border border-[var(--border)] px-3 py-2"
            />
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              className="rounded-xl border border-[var(--border)] px-3 py-2"
            >
              {templates.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-[#205952] px-4 py-2 font-semibold text-white">
              Add application
            </button>
          </form>
          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold text-[var(--muted)]">CSV import</p>
            <textarea
              value={csvInput}
              onChange={(event) => setCsvInput(event.target.value)}
              className="h-28 w-full rounded-xl border border-[var(--border)] p-3 text-sm"
            />
            <button onClick={importCsvRows} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold">
              Import CSV rows
            </button>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-surface p-6 lg:grid-cols-3">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-[var(--muted)]">Total applications</p>
            <p className="mt-1 text-3xl font-bold">{applications.length}</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-[var(--muted)]">Silent after 14+ days</p>
            <p className="mt-1 text-3xl font-bold">{silentCount}</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-[var(--muted)]">Promise</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Order, comprehension, and bounded follow-up. No guarantee of response.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-surface p-6">
          <h2 className="headline text-3xl">Application dashboard</h2>
          <p className="mt-2 text-[var(--muted)]">List + kanban view for observability and silence detection.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--brand-soft)] text-left">
                  <tr>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">{item.company}</td>
                      <td className="px-3 py-2">{item.role}</td>
                      <td className="px-3 py-2">{item.channel}</td>
                      <td className="px-3 py-2">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {statusBuckets.map((bucket) => (
                <div key={bucket.status} className="rounded-2xl border border-[var(--border)] p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{bucket.status}</p>
                  <p className="mt-1 text-2xl font-bold">{bucket.items.length}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-[var(--border)] bg-surface p-6 lg:grid-cols-2">
          <div>
            <h2 className="headline text-3xl">Allowlist inbox ingestion</h2>
            <p className="mt-2 text-[var(--muted)]">
              Add approved senders/domains. Mail outside this allowlist is discarded before parsing.
            </p>
            <form className="mt-4 flex flex-col gap-3" onSubmit={addAllowlistRule}>
              <select
                value={allowlistType}
                onChange={(event) => setAllowlistType(event.target.value as "domain" | "sender")}
                className="rounded-xl border border-[var(--border)] px-3 py-2"
              >
                <option value="domain">Domain</option>
                <option value="sender">Specific sender</option>
              </select>
              <input
                value={allowlistValue}
                onChange={(event) => setAllowlistValue(event.target.value)}
                placeholder={allowlistType === "domain" ? "@greenhouse.io" : "careers@company.com"}
                className="rounded-xl border border-[var(--border)] px-3 py-2"
              />
              <button type="submit" className="rounded-xl bg-[#205952] px-4 py-2 font-semibold text-white">
                Add allowlist rule
              </button>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {allowlist.map((rule) => (
                <li key={rule.id} className="rounded-xl border border-[var(--border)] px-3 py-2">
                  {rule.type}: {rule.value}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="headline text-2xl">Parsing log and confirmation queue</h3>
            <p className="mt-2 text-[var(--muted)]">
              Deterministic templates parse first; ambiguous messages require explicit user confirmation.
            </p>
            <ul className="mt-4 space-y-3">
              {ingestionLog.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="font-semibold">{entry.subject}</p>
                  <p className="text-sm text-[var(--muted)]">{entry.sender}</p>
                  <p className="mt-1 text-sm">status: {entry.status}</p>
                  {entry.status === "needs_confirmation" ? (
                    <button
                      onClick={() => confirmIngestion(entry.id)}
                      className="mt-2 rounded-lg bg-[#205952] px-3 py-1 text-sm font-semibold text-white"
                    >
                      Confirm as application event
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="followup" className="grid gap-6 rounded-3xl border border-[var(--border)] bg-surface p-6 lg:grid-cols-2">
          <div>
            <h2 className="headline text-3xl">Follow-up helper (bounded)</h2>
            <p className="mt-2 text-[var(--muted)]">
              Human-in-the-loop only. One follow-up every 7 days, max five per application.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <select
                value={selectedAppId}
                onChange={(event) => setSelectedAppId(event.target.value)}
                className="rounded-xl border border-[var(--border)] px-3 py-2"
              >
                {applications.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.company} — {item.role}
                  </option>
                ))}
              </select>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as "warm" | "neutral" | "brief")}
                className="rounded-xl border border-[var(--border)] px-3 py-2"
              >
                <option value="warm">Warm</option>
                <option value="neutral">Neutral</option>
                <option value="brief">Brief</option>
              </select>
              <button onClick={createFollowupDraft} className="rounded-xl bg-[#205952] px-4 py-2 font-semibold text-white">
                Generate draft
              </button>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Sends from your own mailbox (mailto or OAuth send). We do not send unsolicited recruiter mail from our domain.
            </p>
          </div>
          <div>
            <textarea
              value={followupDraft}
              onChange={(event) => setFollowupDraft(event.target.value)}
              className="h-56 w-full rounded-2xl border border-[var(--border)] p-3 text-sm"
            />
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--warning-soft)] px-3 py-2 text-sm">
              Legal reminder: anti-spam laws apply. You confirm each send manually.
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-[var(--border)] bg-surface p-6 lg:grid-cols-2">
          <div>
            <h2 className="headline text-3xl">Candidate notifications</h2>
            <p className="mt-2 text-[var(--muted)]">Receive digest updates only for your own applications.</p>
            <label className="mt-4 flex items-center gap-3">
              <input type="checkbox" checked={weeklyDigest} onChange={() => setWeeklyDigest((value) => !value)} />
              Weekly digest
            </label>
            <label className="mt-2 flex items-center gap-3">
              <input type="checkbox" checked={dailyDigest} onChange={() => setDailyDigest((value) => !value)} />
              Daily digest
            </label>
          </div>
          <div className="space-y-3">
            <h3 className="headline text-2xl">Privacy controls</h3>
            <button className="w-full rounded-xl border border-[var(--border)] px-4 py-2 text-left">Export data (JSON + CSV)</button>
            <button className="w-full rounded-xl border border-[var(--border)] px-4 py-2 text-left">Delete account and all stored data</button>
            <button className="w-full rounded-xl border border-[var(--border)] px-4 py-2 text-left">Revoke Gmail / Outlook connection</button>
          </div>
        </section>
      </main>
    </div>
  );
}
