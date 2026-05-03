import { nanoid } from "nanoid";
import type {
  AllowlistRule,
  Application,
  ApplicationEvent,
  ApplicationStatus,
  EmailClassification,
  EmailIngestion,
  EmailProvider,
  ExtensionCapture,
  FollowupDraft,
  InsightSummary,
  JobMatchScore,
  OAuthConnection,
  StoredEmail,
} from "./types.js";

type ApplicationInput = Pick<Application, "company" | "role" | "channel" | "appliedAt" | "sourceUrl" | "notes" | "jobDescription">;
type ApplicationPatch = Partial<Pick<Application, "company" | "role" | "channel" | "sourceUrl" | "notes" | "jobDescription">>;

class InMemoryStore {
  private applications = new Map<string, Application>();
  private allowlistRules = new Map<string, AllowlistRule>();
  private ingestions = new Map<string, EmailIngestion>();
  private followups = new Map<string, FollowupDraft>();
  private events = new Map<string, ApplicationEvent[]>();
  private emails = new Map<string, StoredEmail>();
  private oauthConnections = new Map<string, OAuthConnection[]>();
  private extensionCaptures = new Map<string, ExtensionCapture>();

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
      status: "applied",
      sourceUrl: input.sourceUrl,
      jobDescription: input.jobDescription,
      recruiterEmails: [],
      notes: input.notes,
      lastEventAt: now,
      followupsSent: 0,
    };
    this.applications.set(`${userId}:${appId}`, app);
    this.addEvent(appId, "applied", input.channel === "extension" ? "extension" : "manual", 1);
    return app;
  }

  public listApplications(userId: string): Application[] {
    return [...this.applications.values()]
      .filter((app) => app.userId === userId)
      .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt));
  }

  public findApplicationByCompanyRole(userId: string, company: string, role: string): Application | null {
    const normalizedCompany = company.trim().toLowerCase();
    const normalizedRole = role.trim().toLowerCase();
    return (
      this.listApplications(userId).find(
        (app) => app.company.trim().toLowerCase() === normalizedCompany && app.role.trim().toLowerCase() === normalizedRole,
      ) ?? null
    );
  }

  public upsertApplication(userId: string, input: ApplicationInput): Application {
    const existing = this.findApplicationByCompanyRole(userId, input.company, input.role);
    if (!existing) {
      return this.createApplication(userId, input);
    }

    return this.updateApplication(userId, existing.appId, {
      channel: input.channel || existing.channel,
      sourceUrl: input.sourceUrl ?? existing.sourceUrl,
      jobDescription: input.jobDescription ?? existing.jobDescription,
      notes: input.notes ?? existing.notes,
    }) as Application;
  }

  public updateApplication(userId: string, appId: string, patch: ApplicationPatch): Application | null {
    const key = `${userId}:${appId}`;
    const app = this.applications.get(key);
    if (!app) return null;
    const updated: Application = {
      ...app,
      ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
      lastEventAt: new Date().toISOString(),
    };
    this.applications.set(key, updated);
    return updated;
  }

  public updateStatus(userId: string, appId: string, status: ApplicationStatus): Application | null {
    const key = `${userId}:${appId}`;
    const app = this.applications.get(key);
    if (!app) return null;
    app.status = status;
    app.lastEventAt = new Date().toISOString();
    this.applications.set(key, app);
    const eventType: ApplicationEvent["type"] = status === "silent" || status === "closed" || status === "screening" || status === "decision" ? "other" : status;
    this.addEvent(appId, eventType, "system", 1);
    return app;
  }

  public addRecruiterEmail(userId: string, appId: string, email: string): Application | null {
    const key = `${userId}:${appId}`;
    const app = this.applications.get(key);
    if (!app) return null;
    const normalized = email.trim().toLowerCase();
    if (!app.recruiterEmails.includes(normalized)) {
      app.recruiterEmails = [...app.recruiterEmails, normalized];
      app.lastEventAt = new Date().toISOString();
      this.applications.set(key, app);
    }
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

  public listIngestions(userId: string): EmailIngestion[] {
    return [...this.ingestions.values()].filter((ingestion) => ingestion.userId === userId);
  }

  public hasIngestionForMessage(userId: string, provider: EmailProvider, messageId?: string): boolean {
    if (!messageId) return false;
    return this.listIngestions(userId).some((ingestion) => ingestion.provider === provider && ingestion.messageId === messageId);
  }

  public getIngestionForMessage(userId: string, provider: EmailProvider, messageId?: string): EmailIngestion | null {
    if (!messageId) return null;
    return this.listIngestions(userId).find((ingestion) => ingestion.provider === provider && ingestion.messageId === messageId) ?? null;
  }

  public saveStoredEmail(input: Omit<StoredEmail, "emailId">): StoredEmail {
    const email: StoredEmail = { ...input, emailId: nanoid(14) };
    this.emails.set(`${input.userId}:${email.emailId}`, email);
    return email;
  }

  public listStoredEmails(userId: string, appId?: string): StoredEmail[] {
    return [...this.emails.values()]
      .filter((email) => email.userId === userId && (!appId || email.appId === appId))
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
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

  public addApplicationEvent(
    appId: string,
    type: ApplicationEvent["type"],
    source: ApplicationEvent["source"],
    confidence?: number,
    ingestionId?: string,
    summary?: string,
  ): ApplicationEvent {
    return this.addEvent(appId, type, source, confidence, ingestionId, summary);
  }

  public listTimeline(userId: string, appId: string): ApplicationEvent[] {
    const app = this.applications.get(`${userId}:${appId}`);
    if (!app) return [];
    return [...(this.events.get(appId) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public saveOAuthConnection(userId: string, connection: OAuthConnection): OAuthConnection {
    const current = this.oauthConnections.get(userId) ?? [];
    const withoutProvider = current.filter((item) => item.provider !== connection.provider);
    this.oauthConnections.set(userId, [...withoutProvider, connection]);
    return connection;
  }

  public listOAuthConnections(userId: string): OAuthConnection[] {
    return this.oauthConnections.get(userId) ?? [];
  }

  public revokeOAuthConnection(userId: string, provider: OAuthConnection["provider"]): { revoked: boolean } {
    const current = this.oauthConnections.get(userId) ?? [];
    this.oauthConnections.set(
      userId,
      current.map((connection) =>
        connection.provider === provider ? { ...connection, connected: false, credentialStatus: "revoked" } : connection,
      ),
    );
    return { revoked: true };
  }

  public saveExtensionCapture(input: Omit<ExtensionCapture, "captureId">): ExtensionCapture {
    const capture: ExtensionCapture = { ...input, captureId: nanoid(14) };
    this.extensionCaptures.set(`${input.userId}:${capture.captureId}`, capture);
    return capture;
  }

  public listExtensionCaptures(userId: string): ExtensionCapture[] {
    return [...this.extensionCaptures.values()].filter((capture) => capture.userId === userId);
  }

  public saveMatchScore(userId: string, appId: string, score: JobMatchScore): Application | null {
    const key = `${userId}:${appId}`;
    const app = this.applications.get(key);
    if (!app) return null;
    app.matchScore = score;
    app.lastEventAt = score.createdAt;
    this.applications.set(key, app);
    this.addEvent(appId, "match_scored", "system", score.score / 100, undefined, `Match score ${score.score}`);
    return app;
  }

  public buildInsights(userId: string): InsightSummary {
    const applications = this.listApplications(userId);
    const total = applications.length;
    const events = applications.flatMap((app) => this.events.get(app.appId) ?? []);
    const responses = applications.filter((app) => ["acknowledged", "screening", "interview", "decision", "rejected", "closed"].includes(app.status)).length;
    const interviews = applications.filter((app) => app.status === "interview" || events.some((event) => event.appId === app.appId && event.type === "interview")).length;
    const rejections = applications.filter((app) => app.status === "rejected" || events.some((event) => event.appId === app.appId && event.type === "rejected")).length;
    const ghosted = applications.filter((app) => app.status === "silent").length;
    const rate = (value: number) => (total === 0 ? 0 : Number(((value / total) * 100).toFixed(1)));
    const interviewedWithScores = applications.filter((app) => app.matchScore && (app.status === "interview" || events.some((event) => event.appId === app.appId && event.type === "interview")));
    const averageInterviewScore =
      interviewedWithScores.length === 0
        ? null
        : Math.round(interviewedWithScores.reduce((sum, app) => sum + (app.matchScore?.score ?? 0), 0) / interviewedWithScores.length);

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        applications: total,
        responses,
        interviews,
        rejections,
        ghosted,
      },
      rates: {
        responseRate: rate(responses),
        interviewRate: rate(interviews),
        rejectionRate: rate(rejections),
        ghostingRate: rate(ghosted),
      },
      insights: [
        total >= 3 ? `Response rate is ${rate(responses)}% across ${total} tracked applications.` : "Collect at least three applications for stronger response pattern insights.",
        averageInterviewScore === null
          ? "Match score/interview correlation will appear after scored jobs receive interview events."
          : `Applications reaching interview average a match score of ${averageInterviewScore}.`,
        ghosted > 0 ? `${ghosted} application${ghosted === 1 ? "" : "s"} currently look silent and may need bounded follow-up.` : "No silent applications detected.",
      ],
    };
  }

  private addEvent(
    appId: string,
    type: ApplicationEvent["type"],
    source: ApplicationEvent["source"],
    confidence?: number,
    ingestionId?: string,
    summary?: string,
  ): ApplicationEvent {
    const event: ApplicationEvent = {
      eventId: nanoid(10),
      appId,
      type,
      source,
      createdAt: new Date().toISOString(),
      confidence,
      ingestionId,
      summary,
    };
    const events = this.events.get(appId) ?? [];
    events.push(event);
    this.events.set(appId, events);
    return event;
  }
}

export const store = new InMemoryStore();
