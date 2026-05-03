import { parserTemplateByDomain, type ApplicationEvent, type EmailClassification } from "./types.js";

export interface ExtractedEmailFields {
  company?: string;
  role?: string;
  recruiterEmail?: string;
}

export interface ParseResult {
  confidence: number;
  status: "parsed" | "needs_confirmation" | "discarded_low_confidence";
  parser: "deterministic" | "llm_fallback" | "llm" | "llm_stub";
  classification: EmailClassification;
  eventType: ApplicationEvent["type"];
  extracted: ExtractedEmailFields;
}

const rejectionSignals = [/unfortunately/i, /regret to inform/i, /not moving forward/i, /will not be proceeding/i];
const appliedSignals = [/application received/i, /thanks for applying/i, /we received your application/i, /submitted your application/i];
const interviewSignals = [/interview/i, /schedule/i, /availability/i, /next round/i];
const followUpSignals = [/checking in/i, /follow up/i, /following up/i, /update on your application/i];
const rolePatterns = [
  /(?:for|to our|to the)\s+(?:the\s+)?([A-Z][A-Za-z0-9 /+.#-]*(?:Engineer|Developer|Designer|Manager|Analyst|Specialist|Scientist|Lead|Intern|Role|Position))/,
  /([A-Z][A-Za-z0-9 /+.#-]*(?:Engineer|Developer|Designer|Manager|Analyst|Specialist|Scientist|Lead|Intern))/,
];

function detectClassification(subject: string, body: string): EmailClassification {
  const text = `${subject}\n${body}`;
  if (rejectionSignals.some((pattern) => pattern.test(text))) return "rejected";
  if (interviewSignals.some((pattern) => pattern.test(text))) return "interview";
  if (appliedSignals.some((pattern) => pattern.test(text))) return "applied";
  if (followUpSignals.some((pattern) => pattern.test(text))) return "follow_up";
  return "other";
}

function eventFromClassification(classification: EmailClassification): ApplicationEvent["type"] {
  if (classification === "applied") return "acknowledged";
  if (classification === "interview") return "interview";
  if (classification === "rejected") return "rejected";
  if (classification === "follow_up") return "follow_up";
  return "other";
}

function extractCompany(sender: string, subject: string, body: string): string | undefined {
  const text = `${subject}\n${body}`;
  const roleAtCompany = text.match(
    /(?:Engineer|Developer|Designer|Manager|Analyst|Specialist|Scientist|Lead|Intern|Role|Position)\s+(?:interview\s+)?at\s+([A-Z][A-Za-z0-9 &.'-]{1,48})(?:[,.!\n?]|$)/,
  );
  if (roleAtCompany?.[1]) return roleAtCompany[1].trim();
  const explicit = text.match(/(?:at|with|from)\s+([A-Z][A-Za-z0-9 &.'-]{1,48})(?:[,.!\n]| for| team| careers)/);
  if (explicit?.[1]) return explicit[1].trim();
  const domain = sender.split("@").at(-1)?.split(".").at(0);
  if (!domain || ["gmail", "outlook", "mail", "greenhouse", "lever", "myworkday", "ashbyhq", "smartrecruiters", "linkedin", "indeed"].includes(domain)) {
    return undefined;
  }
  return domain
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractRole(subject: string, body: string): string | undefined {
  const text = `${subject}\n${body}`;
  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function aiPromptForEmail(subject: string, body: string): string {
  return [
    "Classify this job-search email as applied, interview, rejected, follow_up, or other.",
    "Return strict JSON with classification, company, role, recruiterEmail, confidence, and eventType.",
    `Subject: ${subject}`,
    `Body: ${body}`,
  ].join("\n");
}

export function parseEmailMessage(sender: string, subject: string, body: string): ParseResult {
  const domain = sender.includes("@") ? sender.split("@").at(-1)?.toLowerCase() ?? "" : sender.toLowerCase();
  const knownTemplate = Object.keys(parserTemplateByDomain).find((templateDomain) => domain.endsWith(templateDomain));
  const classification = detectClassification(subject, body);
  const eventType = eventFromClassification(classification);
  const company = extractCompany(sender, subject, body);
  const role = extractRole(subject, body);
  const extracted = { company, role, recruiterEmail: sender.toLowerCase() };

  if (classification !== "other" && (knownTemplate || (company && role))) {
    return {
      confidence: knownTemplate ? 0.95 : 0.88,
      status: "parsed",
      parser: knownTemplate ? "deterministic" : "llm_fallback",
      classification,
      eventType,
      extracted,
    };
  }

  if (classification !== "other") {
    void aiPromptForEmail(subject, body);
    return {
      confidence: 0.76,
      status: "needs_confirmation",
      parser: process.env.OPENAI_API_KEY ? "llm" : "llm_fallback",
      classification,
      eventType,
      extracted,
    };
  }

  void aiPromptForEmail(subject, body);
  return {
    confidence: 0.4,
    status: "discarded_low_confidence",
    parser: process.env.OPENAI_API_KEY ? "llm" : "llm_fallback",
    classification,
    eventType,
    extracted: {},
  };
}
