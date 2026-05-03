export const applicationStatuses = [
  "applied",
  "acknowledged",
  "screening",
  "interview",
  "decision",
  "rejected",
  "silent",
  "closed",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const channelTemplates = [
  { id: "linkedin", label: "LinkedIn", defaultChannel: "linkedin" },
  { id: "indeed", label: "Indeed", defaultChannel: "indeed" },
  { id: "glassdoor", label: "Glassdoor", defaultChannel: "glassdoor" },
  { id: "company_portal", label: "Company Portal", defaultChannel: "company_portal" },
  { id: "email", label: "Email Outreach", defaultChannel: "email" },
  { id: "referral", label: "Referral", defaultChannel: "referral" },
  { id: "other", label: "Other", defaultChannel: "other" },
] as const;

export type ChannelTemplate = (typeof channelTemplates)[number];

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
  provider: "gmail" | "outlook" | "alias" | "extension";
  messageId?: string;
  sender: string;
  subject: string;
  receivedAt: string;
  status: "pending" | "parsed" | "needs_confirmation" | "discarded_not_allowlisted" | "discarded_low_confidence" | "failed";
  confidence?: number;
  classification?: "applied" | "interview" | "rejected" | "follow_up" | "other";
  extractedCompany?: string;
  extractedRole?: string;
  recruiterEmail?: string;
  parsedAppId?: string;
}

export interface JobMatchScore {
  score: number;
  missingSkills: string[];
  strengths: string[];
  provider: "deterministic" | "llm" | "llm_stub";
  createdAt: string;
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
