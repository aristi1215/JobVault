export type ApplicationStatus =
  | "applied"
  | "acknowledged"
  | "screening"
  | "interview"
  | "decision"
  | "rejected"
  | "silent"
  | "closed";

export type EmailProvider = "gmail" | "outlook" | "alias" | "extension";
export type EmailClassification = "applied" | "interview" | "rejected" | "follow_up" | "other";

export interface Application {
  appId: string;
  userId: string;
  company: string;
  role: string;
  channel: string;
  appliedAt: string;
  status: ApplicationStatus;
  sourceUrl?: string;
  jobDescription?: string;
  recruiterEmails: string[];
  matchScore?: JobMatchScore;
  lastEventAt: string;
  notes?: string;
  followupsSent: number;
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
  classification?: EmailClassification;
  parser?: "deterministic" | "llm_fallback" | "llm" | "llm_stub";
  extractedCompany?: string;
  extractedRole?: string;
  recruiterEmail?: string;
  parsedAppId?: string;
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

export interface ApplicationEvent {
  eventId: string;
  appId: string;
  type: "applied" | "acknowledged" | "interview" | "rejected" | "follow_up" | "extension_capture" | "match_scored" | "other";
  source: EmailProvider | "manual" | "system";
  createdAt: string;
  confidence?: number;
  ingestionId?: string;
  summary?: string;
}

export interface StoredEmail {
  emailId: string;
  userId: string;
  appId: string;
  provider: EmailProvider;
  messageId?: string;
  sender: string;
  subject: string;
  receivedAt: string;
  classification: EmailClassification;
  bodyPreview: string;
}

export interface OAuthConnection {
  provider: "gmail" | "outlook";
  connected: boolean;
  credentialStatus: "configured" | "missing_credentials" | "revoked";
  scopes: string[];
  lastSyncAt?: string;
  watchExpiry?: string;
  deltaCursor?: string;
  secureTokenRef?: string;
  historicalImportMonths: number;
  authUrl?: string;
  requiredEnv?: string[];
}

export interface JobMatchScore {
  score: number;
  missingSkills: string[];
  strengths: string[];
  provider: "deterministic" | "llm" | "llm_stub";
  createdAt: string;
}

export interface ExtensionCapture {
  captureId: string;
  userId: string;
  appId: string;
  title: string;
  company: string;
  description: string;
  sourceUrl?: string;
  capturedAt: string;
}

export interface InsightSummary {
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

export const parserTemplateByDomain: Record<string, string> = {
  "greenhouse.io": "greenhouse",
  "lever.co": "lever",
  "myworkday.com": "workday",
  "ashbyhq.com": "ashby",
  "smartrecruiters.com": "smartrecruiters",
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
};
