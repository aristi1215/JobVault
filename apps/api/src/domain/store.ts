import { nanoid } from "nanoid";
import type { AllowlistRule, Application, ApplicationStatus, EmailIngestion, FollowupDraft } from "./types.js";

interface EventRecord {
  eventId: string;
  appId: string;
  type: string;
  source: string;
  createdAt: string;
  confidence?: number;
}

type ApplicationInput = Pick<Application, "company" | "role" | "channel" | "appliedAt" | "sourceUrl" | "notes">;

class InMemoryStore {
  private applications = new Map<string, Application>();
  private allowlistRules = new Map<string, AllowlistRule>();
  private ingestions = new Map<string, EmailIngestion>();
  private followups = new Map<string, FollowupDraft>();
  private events = new Map<string, EventRecord[]>();

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
      notes: input.notes,
      lastEventAt: now,
      followupsSent: 0,
    };
    this.applications.set(`${userId}:${appId}`, app);
    this.addEvent(appId, "applied", "manual", 1);
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
    this.addEvent(appId, status, "system", 1);
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

  private addEvent(appId: string, type: string, source: string, confidence?: number): void {
    const event: EventRecord = {
      eventId: nanoid(10),
      appId,
      type,
      source,
      createdAt: new Date().toISOString(),
      confidence,
    };
    const events = this.events.get(appId) ?? [];
    events.push(event);
    this.events.set(appId, events);
  }
}

export const store = new InMemoryStore();
