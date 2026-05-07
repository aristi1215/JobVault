import { nanoid } from "nanoid";
import type {
  AllowlistRule,
  Application,
  ApplicationStatus,
  EmailClassification,
  EmailIngestion,
  ExtensionCapture,
  FollowupDraft,
  JobMatchAnalysis,
  OAuthConnection,
  TimelineEvent,
} from "./types.js";

type ApplicationInput = Pick<Application, "company" | "role" | "channel" | "appliedAt" | "sourceUrl" | "description" | "notes"> &
  Partial<Pick<Application, "source" | "recruiterEmails" | "status">>;

class InMemoryStore {
  private applications = new Map<string, Application>();
  private allowlistRules = new Map<string, AllowlistRule>();
  private ingestions = new Map<string, EmailIngestion>();
  private followups = new Map<string, FollowupDraft>();
  private events = new Map<string, TimelineEvent[]>();
  private oauthConnections = new Map<string, OAuthConnection[]>();

  public createApplication(userId: string, input: ApplicationInput): Application {
    const appId = nanoid(12);
    const now = new Date().toISOString();
    const app: Application = {
      appId,
      userId,
      company: input.company,
      role: input.role,
      channel: input.channel,
      appliedAt: input.appliedAt,
      status: input.status ?? "applied",
      source: input.source ?? "manual",
      sourceUrl: input.sourceUrl,
      description: input.description,
      notes: input.notes,
      lastEventAt: now,
      followupsSent: 0,
      recruiterEmails: normalizeEmails(input.recruiterEmails ?? []),
    };
    this.applications.set(`${userId}:${appId}`, app);
    this.addEvent(appId, app.source === "browser_extension" ? "extension_capture" : app.status, app.source, 1);
    return app;
  }

  public listApplications(userId: string): Application[] {
    return [...this.applications.values()]
      .filter((app) => app.userId === userId)
      .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt));
  }

  public removeApplication(userId: string, appId: string): void {
    this.applications.delete(`${userId}:${appId}`);
  }

  public updateStatus(userId: string, appId: string, status: ApplicationStatus): Application | null {
    const key = `${userId}:${appId}`;
    const app = this.applications.get(key);
    if (!app) return null;
    app.status = status;
    app.lastEventAt = new Date().toISOString();
    this.applications.set(key, app);
    this.addEvent(appId, status === "applied" ? "applied" : "manual_update", "system", 1);
    return app;
  }

  public upsertApplicationFromEmail(
    userId: string,
    input: {
      company?: string;
      role?: string;
      classification: EmailClassification;
      timestamp: string;
      recruiterEmail?: string;
      ingestionId: string;
      confidence: number;
    },
  ): Application | null {
    if (!input.company || !input.role || input.classification === "other") return null;

    const app = this.findMatchingApplication(userId, input.company, input.role);
    const status = mapClassificationToStatus(input.classification);
    const summary = `${input.classification} email detected for ${input.role} at ${input.company}`;
    if (app) {
      app.status = status;
      app.lastEventAt = input.timestamp;
      app.recruiterEmails = normalizeEmails([...app.recruiterEmails, input.recruiterEmail].filter(Boolean) as string[]);
      this.applications.set(`${userId}:${app.appId}`, app);
      this.addEvent(app.appId, input.classification, "email", input.confidence, {
        ingestionId: input.ingestionId,
        recruiterEmail: input.recruiterEmail,
        summary,
        createdAt: input.timestamp,
      });
      return app;
    }

    const created = this.createApplication(userId, {
      company: input.company,
      role: input.role,
      channel: "email",
      appliedAt: input.timestamp,
      source: "email",
      status,
      recruiterEmails: input.recruiterEmail ? [input.recruiterEmail] : [],
      notes: "Automatically reconstructed from email ingestion.",
    });
    this.addEvent(created.appId, input.classification, "email", input.confidence, {
      ingestionId: input.ingestionId,
      recruiterEmail: input.recruiterEmail,
      summary,
      createdAt: input.timestamp,
    });
    return created;
  }

  public upsertApplicationFromExtension(userId: string, input: ExtensionCapture): Application {
    const capturedAt = input.capturedAt ?? new Date().toISOString();
    const existing = this.findMatchingApplication(userId, input.company, input.title);
    if (existing) {
      existing.description = input.description;
      existing.sourceUrl = input.sourceUrl ?? existing.sourceUrl;
      existing.lastEventAt = capturedAt;
      this.applications.set(`${userId}:${existing.appId}`, existing);
      this.addEvent(existing.appId, "extension_capture", "browser_extension", 1, {
        createdAt: capturedAt,
        summary: `Browser extension captured ${input.title} at ${input.company}`,
      });
      return existing;
    }

    const app = this.createApplication(userId, {
      company: input.company,
      role: input.title,
      channel: "browser_extension",
      appliedAt: capturedAt,
      source: "browser_extension",
      sourceUrl: input.sourceUrl,
      description: input.description,
      notes: "Captured by browser extension and ready to merge with email events.",
    });
    return app;
  }

  public getTimeline(userId: string, appId: string): TimelineEvent[] {
    const app = this.applications.get(`${userId}:${appId}`);
    if (!app) return [];
    return [...(this.events.get(appId) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public setMatchAnalysis(userId: string, appId: string, match: JobMatchAnalysis): Application | null {
    const key = `${userId}:${appId}`;
    const app = this.applications.get(key);
    if (!app) return null;
    app.match = match;
    this.applications.set(key, app);
    return app;
  }

  public addAllowlistRule(userId: string, type: "domain" | "sender", value: string): AllowlistRule {
    const rule: AllowlistRule = {
      ruleId: nanoid(10),
      userId,
      type,
      value: value.trim().toLowerCase(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    this.allowlistRules.set(`${userId}:${rule.ruleId}`, rule);
    return rule;
  }

  public listAllowlistRules(userId: string): AllowlistRule[] {
    return [...this.allowlistRules.values()].filter((rule) => rule.userId === userId && rule.enabled);
  }

  public isSenderAllowlisted(userId: string, sender: string): boolean {
    const normalized = sender.trim().toLowerCase();
    const rules = this.listAllowlistRules(userId);
    return rules.some((rule) => {
      if (rule.type === "sender") return rule.value === normalized;
      return normalized.endsWith(rule.value.startsWith("@") ? rule.value : `@${rule.value}`);
    });
  }

  public createIngestion(input: Omit<EmailIngestion, "ingestionId">): EmailIngestion {
    const ingestion: EmailIngestion = { ...input, ingestionId: nanoid(14) };
    this.ingestions.set(`${ingestion.userId}:${ingestion.ingestionId}`, ingestion);
    return ingestion;
  }

  public updateIngestion(userId: string, ingestionId: string, patch: Partial<EmailIngestion>): EmailIngestion | null {
    const key = `${userId}:${ingestionId}`;
    const ingestion = this.ingestions.get(key);
    if (!ingestion) return null;
    const updated = { ...ingestion, ...patch };
    this.ingestions.set(key, updated);
    return updated;
  }

  public listIngestions(userId: string): EmailIngestion[] {
    return [...this.ingestions.values()].filter((ingestion) => ingestion.userId === userId);
  }

  public listTimelines(userId: string): Map<string, TimelineEvent[]> {
    const timelines = new Map<string, TimelineEvent[]>();
    for (const app of this.listApplications(userId)) {
      timelines.set(app.appId, this.getTimeline(userId, app.appId));
    }
    return timelines;
  }

  public hasIngestionForMessage(userId: string, provider: string, messageId: string): boolean {
    return [...this.ingestions.values()].some(
      (ingestion) => ingestion.userId === userId && ingestion.provider === provider && ingestion.messageId === messageId,
    );
  }

  public saveFollowupDraft(draft: Omit<FollowupDraft, "draftId" | "createdAt" | "status">): FollowupDraft {
    const completeDraft: FollowupDraft = {
      ...draft,
      draftId: nanoid(14),
      createdAt: new Date().toISOString(),
      status: "draft",
    };
    this.followups.set(`${draft.userId}:${completeDraft.draftId}`, completeDraft);
    return completeDraft;
  }

  public countFollowupsForApplication(appId: string): number {
    return [...this.followups.values()].filter((item) => item.appId === appId).length;
  }

  public getLastFollowupSentAt(appId: string): string | null {
    const items = [...this.followups.values()]
      .filter((item) => item.appId === appId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items.at(0)?.createdAt ?? null;
  }

  public listFollowups(userId: string): FollowupDraft[] {
    return [...this.followups.values()].filter((draft) => draft.userId === userId);
  }

  public saveOAuthConnection(userId: string, connection: OAuthConnection): OAuthConnection {
    const current = this.oauthConnections.get(userId) ?? [];
    const next = current.filter((item) => item.provider !== connection.provider);
    this.oauthConnections.set(userId, [...next, connection]);
    return connection;
  }

  public listOAuthConnections(userId: string): OAuthConnection[] {
    return this.oauthConnections.get(userId) ?? [];
  }

  public revokeOAuthConnection(userId: string, provider: OAuthConnection["provider"]): { revoked: boolean } {
    const current = this.oauthConnections.get(userId) ?? [];
    this.oauthConnections.set(
      userId,
      current.map((item) => (item.provider === provider ? { ...item, connected: false, syncStatus: "revoked" } : item)),
    );
    return { revoked: true };
  }

  private findMatchingApplication(userId: string, company: string, role: string): Application | null {
    const normalizedCompany = normalize(company);
    const normalizedRole = normalize(role);
    return (
      this.listApplications(userId).find(
        (app) => normalize(app.company) === normalizedCompany && normalize(app.role) === normalizedRole,
      ) ?? null
    );
  }

  private addEvent(
    appId: string,
    type: TimelineEvent["type"],
    source: TimelineEvent["source"],
    confidence?: number,
    options: Partial<Omit<TimelineEvent, "eventId" | "appId" | "type" | "source" | "confidence">> = {},
  ): void {
    const event: TimelineEvent = {
      eventId: nanoid(10),
      appId,
      type,
      source,
      createdAt: options.createdAt ?? new Date().toISOString(),
      confidence,
      ingestionId: options.ingestionId,
      recruiterEmail: options.recruiterEmail,
      summary: options.summary,
    };
    const events = this.events.get(appId) ?? [];
    events.push(event);
    this.events.set(appId, events);
  }
}

export const store = new InMemoryStore();

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEmails(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function mapClassificationToStatus(classification: EmailClassification): ApplicationStatus {
  switch (classification) {
    case "interview":
      return "interview";
    case "rejected":
      return "closed";
    case "follow_up":
      return "acknowledged";
    case "applied":
    case "other":
      return "applied";
  }
}
