import { fetchProviderMessages } from "./email-providers.js";
import { scoreJobMatch } from "./match-scoring.js";
import { parseEmailMessage } from "./parser.js";
import { store } from "./store.js";
import type { Application, EmailIngestion, EmailProvider } from "./types.js";

interface EmailAutomationInput {
  userId: string;
  provider: EmailProvider;
  sender: string;
  subject: string;
  body: string;
  receivedAt?: string;
  messageId?: string;
}

export function shouldBypassAllowlistForAutomation(input: Pick<EmailAutomationInput, "provider">): boolean {
  return input.provider === "extension";
}

function statusFromClassification(classification: ReturnType<typeof parseEmailMessage>["classification"]): Application["status"] {
  if (classification === "interview") return "interview";
  if (classification === "rejected") return "rejected";
  if (classification === "applied") return "acknowledged";
  return "applied";
}

function fallbackCompany(sender: string): string {
  const domain = sender.split("@").at(-1)?.split(".").at(0) ?? "Unknown Company";
  return domain
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ingestEmailWithAutomation(input: EmailAutomationInput): EmailIngestion {
  if (store.hasIngestionForMessage(input.userId, input.provider, input.messageId)) {
    return (
      store
        .listIngestions(input.userId)
        .find((ingestion) => ingestion.provider === input.provider && ingestion.messageId === input.messageId) as EmailIngestion
    );
  }

  const parsed = parseEmailMessage(input.sender, input.subject, input.body);
  const receivedAt = input.receivedAt ?? new Date().toISOString();
  let parsedAppId: string | undefined;

  if (parsed.status === "parsed" || parsed.status === "needs_confirmation") {
    const app = store.upsertApplication(input.userId, {
      company: parsed.extracted.company ?? fallbackCompany(input.sender),
      role: parsed.extracted.role ?? "Unknown Role",
      channel: input.provider,
      appliedAt: receivedAt,
      notes: `Auto-detected from ${input.provider} email: ${input.subject}`,
    });
    parsedAppId = app.appId;
    const nextStatus = statusFromClassification(parsed.classification);
    if (nextStatus !== "applied" || app.status === "applied") {
      store.updateStatus(input.userId, app.appId, nextStatus);
    }
    if (parsed.extracted.recruiterEmail) {
      store.addRecruiterEmail(input.userId, app.appId, parsed.extracted.recruiterEmail);
    }
  }

  const ingestion = store.createIngestion({
    userId: input.userId,
    provider: input.provider,
    messageId: input.messageId,
    sender: input.sender,
    subject: input.subject,
    receivedAt,
    status: parsed.status,
    confidence: parsed.confidence,
    classification: parsed.classification,
    parser: parsed.parser,
    extractedCompany: parsed.extracted.company,
    extractedRole: parsed.extracted.role,
    recruiterEmail: parsed.extracted.recruiterEmail,
    parsedAppId,
  });

  if (parsedAppId) {
    store.saveStoredEmail({
      userId: input.userId,
      appId: parsedAppId,
      provider: input.provider,
      messageId: input.messageId,
      sender: input.sender,
      subject: input.subject,
      receivedAt,
      classification: parsed.classification,
      bodyPreview: input.body.slice(0, 500),
    });
    store.addApplicationEvent(parsedAppId, parsed.eventType, input.provider, parsed.confidence, ingestion.ingestionId, input.subject);
  }

  return ingestion;
}

export async function syncConnectedProvider(
  userId: string,
  provider: Extract<EmailProvider, "gmail" | "outlook">,
  historicalImportMonths = 6,
) {
  const sync = await fetchProviderMessages(provider, userId, historicalImportMonths > 0 ? "historical_import" : "incremental");
  const ingestions = sync.messages.map((message) =>
    ingestEmailWithAutomation({
      userId,
      provider: message.provider,
      messageId: message.messageId,
      sender: message.sender,
      subject: message.subject,
      body: message.body,
      receivedAt: message.receivedAt,
    }),
  );

  return {
    provider,
    mode: sync.mode,
    credentialStatus: sync.credentialStatus,
    historicalImportMonths,
    fetched: sync.messages.length,
    processed: ingestions.length,
    ingestions,
    nextCursor: sync.nextCursor,
  };
}

export function captureExtensionJob(input: {
  userId: string;
  title: string;
  company: string;
  description: string;
  sourceUrl?: string;
  capturedAt?: string;
}) {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const app = store.upsertApplication(input.userId, {
    company: input.company,
    role: input.title,
    channel: "extension",
    appliedAt: capturedAt,
    sourceUrl: input.sourceUrl,
    jobDescription: input.description,
    notes: "Captured automatically from browser extension.",
  });
  store.addApplicationEvent(app.appId, "extension_capture", "extension", 1, undefined, input.sourceUrl);
  return store.saveExtensionCapture({
    userId: input.userId,
    appId: app.appId,
    title: input.title,
    company: input.company,
    description: input.description,
    sourceUrl: input.sourceUrl,
    capturedAt,
  });
}

export async function scoreApplicationMatch(userId: string, appId: string, cvText: string): Promise<Application> {
  const app = store.listApplications(userId).find((item) => item.appId === appId);
  if (!app) throw new Error("Application not found.");
  if (!app.jobDescription) throw new Error("Job description is required before match scoring.");
  const score = await scoreJobMatch(app.jobDescription, cvText);
  const updated = store.saveMatchScore(userId, appId, score);
  if (!updated) throw new Error("Application not found.");
  return updated;
}
