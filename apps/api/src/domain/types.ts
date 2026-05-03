export type ApplicationStatus = "applied" | "acknowledged" | "screening" | "interview" | "decision" | "silent" | "closed";

export type EmailProvider = "gmail" | "outlook" | "alias";

export type EmailClassification = "applied" | "interview" | "rejected" | "follow_up" | "other";

export type ApplicationSource = "manual" | "email" | "browser_extension";

export interface Application {
  appId: string;
  userId: string;
  company: string;
  role: string;
  channel: string;
  appliedAt: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  sourceUrl?: string;
  description?: string;
  lastEventAt: string;
  notes?: string;
  followupsSent: number;
  recruiterEmails: string[];
  match?: JobMatchAnalysis;
}

export interface TimelineEvent {
  eventId: string;
  appId: string;
  type: EmailClassification | ApplicationStatus | "manual_update" | "extension_capture";
  source: ApplicationSource | EmailProvider | "system";
  createdAt: string;
  confidence?: number;
  ingestionId?: string;
  recruiterEmail?: string;
  summary?: string;
}

export interface AllowlistRule {
  ruleId: string;
  userId: string;
  type: "domain" | "sender";
  value: string;
  enabled: boolean;
  createdAt: string;
}

export interface EmailIngestion {
  ingestionId: string;
  userId: string;
  provider: EmailProvider;
  messageId?: string;
  sender: string;
  subject: string;
  receivedAt: string;
  status: "pending" | "parsed" | "needs_confirmation" | "discarded_not_allowlisted" | "discarded_low_confidence" | "failed";
  confidence?: number;
  parsedAppId?: string;
  classification?: EmailClassification;
  company?: string;
  role?: string;
  recruiterEmail?: string;
  rawEmailRef?: string;
}

export interface ParsedEmailResult {
  confidence: number;
  status: EmailIngestion["status"];
  parser: "deterministic" | "llm" | "llm_stub";
  classification: EmailClassification;
  company?: string;
  role?: string;
  recruiterEmail?: string;
  timestamp?: string;
  reasoning?: string;
}

export interface JobMatchAnalysis {
  score: number;
  missingSkills: string[];
  strengths: string[];
  generatedAt: string;
  provider: "llm" | "heuristic_stub";
}

export interface OAuthConnection {
  provider: Exclude<EmailProvider, "alias">;
  connected: boolean;
  scopes: string[];
  lastSyncAt?: string;
  historicalImportStartedAt?: string;
  historicalImportMonths: number;
  watchExpiry?: string;
  tokenSecretRef?: string;
  authUrl?: string;
  syncStatus: "needs_credentials" | "ready" | "syncing" | "revoked";
}

export interface EmailProviderMessage {
  provider: EmailProvider;
  messageId: string;
  sender: string;
  subject: string;
  body: string;
  receivedAt: string;
  rawEmailRef?: string;
}

export interface ExtensionCapture {
  title: string;
  company: string;
  description: string;
  sourceUrl?: string;
  capturedAt?: string;
}

export interface InsightReport {
  generatedAt: string;
  totals: {
    applications: number;
    responses: number;
    interviews: number;
    rejections: number;
    ghosted: number;
  };
  rates: {
    responseRate: number;
    interviewRate: number;
    rejectionRate: number;
    ghostingRate: number;
  };
  insights: string[];
}

export interface FollowupDraft {
  draftId: string;
  appId: string;
  userId: string;
  recipientRole: "recruiter" | "hiring_manager" | "unknown";
  tone: "warm" | "neutral" | "brief";
  body: string;
  status: "draft" | "sent_local" | "sent_oauth";
  createdAt: string;
}

export const parserTemplateByDomain: Record<string, string> = {
  "greenhouse.io": "greenhouse",
  "lever.co": "lever",
  "myworkday.com": "workday",
  "ashbyhq.com": "ashby",
  "smartrecruiters.com": "smartrecruiters",
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
};
