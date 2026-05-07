import { z } from "zod";
import { store } from "./domain/store.js";
import { buildFollowupDraft, isFollowupAllowed } from "./domain/followup.js";
import { parseEmailMessage } from "./domain/parser.js";
import { connectProvider, fetchProviderMessages, listConnections, revokeConnection } from "./domain/oauth.js";
import { generateMatchAnalysis } from "./domain/match-scoring.js";
import { buildInsightReport } from "./domain/insights.js";

const createApplicationSchema = z.object({
  userId: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  channel: z.string().min(1),
  appliedAt: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  description: z.string().optional(),
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
  messageId: z.string().min(1).optional(),
  sender: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  receivedAt: z.string().min(1).optional(),
  rawEmailRef: z.string().optional(),
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
  authCode: z.string().optional(),
  redirectUri: z.string().url().optional(),
  historicalImportMonths: z.number().int().min(1).max(6).optional(),
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
  if (parsed.messageId && store.hasIngestionForMessage(parsed.userId, parsed.provider, parsed.messageId)) {
    const existing = store
      .listIngestions(parsed.userId)
      .find((item) => item.provider === parsed.provider && item.messageId === parsed.messageId);
    if (existing) return existing;
  }

  const allowlisted = store.isSenderAllowlisted(parsed.userId, parsed.sender);
  if (!allowlisted) {
    return store.createIngestion({
      userId: parsed.userId,
      provider: parsed.provider,
      messageId: parsed.messageId,
      sender: parsed.sender,
      subject: parsed.subject,
      receivedAt: parsed.receivedAt ?? new Date().toISOString(),
      status: "discarded_not_allowlisted",
      rawEmailRef: parsed.rawEmailRef,
    });
  }

  const parse = parseEmailMessage(parsed.sender, parsed.subject, parsed.body);
  const ingestion = store.createIngestion({
    userId: parsed.userId,
    provider: parsed.provider,
    messageId: parsed.messageId,
    sender: parsed.sender,
    subject: parsed.subject,
    receivedAt: parsed.receivedAt ?? parse.timestamp ?? new Date().toISOString(),
    status: parse.status,
    confidence: parse.confidence,
    classification: parse.classification,
    company: parse.company,
    role: parse.role,
    recruiterEmail: parse.recruiterEmail,
    rawEmailRef: parsed.rawEmailRef,
  });
  const app = store.upsertApplicationFromEmail(parsed.userId, {
    company: parse.company,
    role: parse.role,
    classification: parse.classification,
    timestamp: ingestion.receivedAt,
    recruiterEmail: parse.recruiterEmail,
    ingestionId: ingestion.ingestionId,
    confidence: parse.confidence,
  });
  if (app) {
    return store.updateIngestion(parsed.userId, ingestion.ingestionId, { parsedAppId: app.appId }) ?? ingestion;
  }
  return ingestion;
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

export function exportUserData(userId: string) {
  return {
    exportedAt: new Date().toISOString(),
    applications: store.listApplications(userId),
    allowlist: store.listAllowlistRules(userId),
    ingestions: store.listIngestions(userId),
    followups: store.listFollowups(userId),
    oauth: store.listOAuthConnections(userId),
  };
}

export function deleteAccount(userId: string) {
  return {
    queued: true,
    message: `Deletion workflow queued for ${userId}. Wire this to DynamoDB + S3 + Secrets cleanup in production.`,
  };
}

export function updateApplicationStatus(userId: string, appId: string, payload: unknown) {
  const schema = z.object({ status: z.enum(["applied", "acknowledged", "screening", "interview", "decision", "silent", "closed"]) });
  const parsed = schema.parse(payload);
  const updated = store.updateStatus(userId, appId, parsed.status);
  if (!updated) throw new Error("Application not found.");
  return updated;
}

export function deleteApplication(userId: string, appId: string) {
  const apps = store.listApplications(userId);
  const app = apps.find((a) => a.appId === appId);
  if (!app) throw new Error("Application not found.");
  store.removeApplication(userId, appId);
  return { deleted: true, appId };
}

export function connectOAuth(payload: unknown) {
  const parsed = providerSchema.parse(payload);
  return connectProvider(parsed.userId, parsed.provider, {
    authCode: parsed.authCode,
    redirectUri: parsed.redirectUri,
    historicalImportMonths: parsed.historicalImportMonths,
  });
}

export function listOAuthConnections(userId: string) {
  return listConnections(userId);
}

export function revokeOAuth(payload: unknown) {
  const parsed = providerSchema.parse(payload);
  return revokeConnection(parsed.userId, parsed.provider);
}

export function syncOAuthProvider(payload: unknown) {
  const parsed = providerSchema.pick({ userId: true, provider: true }).parse(payload);
  const connection = listConnections(parsed.userId).find((item) => item.provider === parsed.provider);
  if (!connection) throw new Error("OAuth connection not found.");
  const messages = fetchProviderMessages(connection);
  const ingestions = messages.map((message) =>
    ingestEmail({
      userId: parsed.userId,
      provider: message.provider,
      messageId: message.messageId,
      sender: message.sender,
      subject: message.subject,
      body: message.body,
      receivedAt: message.receivedAt,
      rawEmailRef: message.rawEmailRef,
    }),
  );
  return {
    provider: parsed.provider,
    fetched: messages.length,
    ingested: ingestions.length,
    ingestions,
  };
}

export function captureFromExtension(payload: unknown) {
  const parsed = extensionCaptureSchema.parse(payload);
  return store.upsertApplicationFromExtension(parsed.userId, parsed);
}

export function scoreApplicationMatch(payload: unknown) {
  const parsed = matchScoreSchema.parse(payload);
  const app = store.listApplications(parsed.userId).find((item) => item.appId === parsed.appId);
  if (!app) throw new Error("Application not found.");
  const match = generateMatchAnalysis(app.description ?? `${app.role} ${app.company}`, parsed.cvText);
  return store.setMatchAnalysis(parsed.userId, parsed.appId, match);
}

export function getApplicationTimeline(userId: string, appId: string) {
  const timeline = store.getTimeline(userId, appId);
  if (timeline.length === 0) throw new Error("Application not found.");
  return timeline;
}

export function getInsights(userId: string) {
  return buildInsightReport(store.listApplications(userId), store.listTimelines(userId));
}
