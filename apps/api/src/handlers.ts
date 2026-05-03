import { z } from "zod";
import { store } from "./domain/store.js";
import { captureExtensionJob, ingestEmailWithAutomation, scoreApplicationMatch, syncConnectedProvider } from "./domain/automation.js";
import { getProviderConfigStatus } from "./domain/email-providers.js";
import { buildFollowupDraft, isFollowupAllowed } from "./domain/followup.js";
import { connectProvider, listConnections, revokeConnection } from "./domain/oauth.js";

const createApplicationSchema = z.object({
  userId: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  channel: z.string().min(1),
  appliedAt: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  jobDescription: z.string().optional(),
  notes: z.string().optional(),
});

const addAllowlistSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["domain", "sender"]),
  value: z.string().min(1),
});

const ingestSchema = z.object({
  userId: z.string().min(1),
  provider: z.enum(["gmail", "outlook", "alias"]),
  messageId: z.string().optional(),
  sender: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  receivedAt: z.string().min(1).optional(),
});

const draftSchema = z.object({
  userId: z.string().min(1),
  appId: z.string().min(1),
  tone: z.enum(["warm", "neutral", "brief"]).default("neutral"),
  recipientRole: z.enum(["recruiter", "hiring_manager", "unknown"]).default("unknown"),
});

const providerSchema = z.object({
  userId: z.string().min(1),
  provider: z.enum(["gmail", "outlook"]),
});

const syncProviderSchema = providerSchema.extend({
  historicalImportMonths: z.number().int().min(1).max(6).default(6),
});

const extensionCaptureSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  capturedAt: z.string().min(1).optional(),
});

const matchScoreSchema = z.object({
  userId: z.string().min(1),
  appId: z.string().min(1),
  cvText: z.string().min(1),
});

export function createApplication(payload: unknown) {
  const parsed = createApplicationSchema.parse(payload);
  return store.createApplication(parsed.userId, parsed);
}

export function listApplications(userId: string) {
  return store.listApplications(userId);
}

export function addAllowlistRule(payload: unknown) {
  const parsed = addAllowlistSchema.parse(payload);
  return store.addAllowlistRule(parsed.userId, parsed.type, parsed.value);
}

export function listAllowlist(userId: string) {
  return store.listAllowlistRules(userId);
}

export function ingestEmail(payload: unknown) {
  const parsed = ingestSchema.parse(payload);
  const allowlisted = store.isSenderAllowlisted(parsed.userId, parsed.sender);
  if (!allowlisted) {
    return store.createIngestion({
      userId: parsed.userId,
      provider: parsed.provider,
      sender: parsed.sender,
      subject: parsed.subject,
      messageId: parsed.messageId,
      receivedAt: parsed.receivedAt ?? new Date().toISOString(),
      status: "discarded_not_allowlisted",
    });
  }

  return ingestEmailWithAutomation(parsed);
}

export function generateFollowup(payload: unknown) {
  const parsed = draftSchema.parse(payload);
  const app = store.listApplications(parsed.userId).find((item) => item.appId === parsed.appId);

  if (!app) {
    throw new Error("Application not found.");
  }

  const total = store.countFollowupsForApplication(app.appId);
  const allowed = isFollowupAllowed(store.getLastFollowupSentAt(app.appId), total);
  if (!allowed.allowed) {
    throw new Error(allowed.reason);
  }

  const draft = store.saveFollowupDraft({
    appId: app.appId,
    userId: parsed.userId,
    recipientRole: parsed.recipientRole,
    tone: parsed.tone,
    body: buildFollowupDraft(app, parsed.tone),
  });
  return draft;
}

export function listIngestionLog(userId: string) {
  return store.listIngestions(userId);
}

export function listFollowups(userId: string) {
  return store.listFollowups(userId);
}

export function listEmails(userId: string, appId?: string) {
  return store.listStoredEmails(userId, appId);
}

export function listTimeline(userId: string, appId: string) {
  return store.listTimeline(userId, appId);
}

export function captureFromExtension(payload: unknown) {
  const parsed = extensionCaptureSchema.parse(payload);
  return captureExtensionJob(parsed);
}

export function listExtensionCaptures(userId: string) {
  return store.listExtensionCaptures(userId);
}

export async function generateMatchScore(payload: unknown) {
  const parsed = matchScoreSchema.parse(payload);
  return scoreApplicationMatch(parsed.userId, parsed.appId, parsed.cvText);
}

export function getInsights(userId: string) {
  return store.buildInsights(userId);
}

export function exportUserData(userId: string) {
  return {
    exportedAt: new Date().toISOString(),
    applications: store.listApplications(userId),
    allowlist: store.listAllowlistRules(userId),
    ingestions: store.listIngestions(userId),
    emails: store.listStoredEmails(userId),
    extensionCaptures: store.listExtensionCaptures(userId),
    insights: store.buildInsights(userId),
    followups: store.listFollowups(userId),
  };
}

export function deleteAccount(userId: string) {
  return {
    queued: true,
    message: `Deletion workflow queued for ${userId}. Wire this to DynamoDB + S3 + Secrets cleanup in production.`,
  };
}

export function connectOAuth(payload: unknown) {
  const parsed = providerSchema.parse(payload);
  return connectProvider(parsed.userId, parsed.provider);
}

export function listOAuthConnections(userId: string) {
  return {
    connections: listConnections(userId),
    providers: getProviderConfigStatus(),
  };
}

export async function syncOAuth(payload: unknown) {
  const parsed = syncProviderSchema.parse(payload);
  return syncConnectedProvider(parsed.userId, parsed.provider, parsed.historicalImportMonths);
}

export function revokeOAuth(payload: unknown) {
  const parsed = providerSchema.parse(payload);
  return revokeConnection(parsed.userId, parsed.provider);
}
