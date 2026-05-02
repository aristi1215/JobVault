export type ApplicationStatus = "applied" | "acknowledged" | "screening" | "interview" | "decision" | "silent" | "closed";

export interface Application {
  appId: string;
  userId: string;
  company: string;
  role: string;
  channel: string;
  appliedAt: string;
  status: ApplicationStatus;
  sourceUrl?: string;
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
  provider: "gmail" | "outlook" | "alias";
  sender: string;
  subject: string;
  receivedAt: string;
  status: "pending" | "parsed" | "needs_confirmation" | "discarded_not_allowlisted" | "discarded_low_confidence" | "failed";
  confidence?: number;
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

export const parserTemplateByDomain: Record<string, string> = {
  "greenhouse.io": "greenhouse",
  "lever.co": "lever",
  "myworkday.com": "workday",
  "ashbyhq.com": "ashby",
  "smartrecruiters.com": "smartrecruiters",
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
};
