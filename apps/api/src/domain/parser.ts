import { parserTemplateByDomain, type EmailClassification, type ParsedEmailResult } from "./types.js";

const rejectionSignals = [/unfortunately/i, /regret to inform/i, /not moving forward/i];
const acknowledgementSignals = [/application received/i, /thanks for applying/i, /we received your application/i, /application submitted/i];
const interviewSignals = [/interview/i, /schedule/i, /availability/i];
const followUpSignals = [/following up/i, /next steps/i, /update/i];

function detectClassification(subject: string, body: string): EmailClassification {
  const text = `${subject}\n${body}`;
  if (rejectionSignals.some((pattern) => pattern.test(text))) return "rejected";
  if (interviewSignals.some((pattern) => pattern.test(text))) return "interview";
  if (acknowledgementSignals.some((pattern) => pattern.test(text))) return "applied";
  if (followUpSignals.some((pattern) => pattern.test(text))) return "follow_up";
  return "other";
}

export function parseEmailMessage(sender: string, subject: string, body: string): ParsedEmailResult {
  const domain = sender.includes("@") ? sender.split("@").at(-1)?.toLowerCase() ?? "" : sender.toLowerCase();
  const knownTemplate = Object.keys(parserTemplateByDomain).find((templateDomain) => domain.endsWith(templateDomain));
  const classification = detectClassification(subject, body);
  const extracted = extractStructuredFields(sender, subject, body);

  if (knownTemplate && classification !== "other") {
    return {
      confidence: 0.95,
      status: "parsed",
      parser: "deterministic",
      classification,
      ...extracted,
    };
  }

  const llmResult = classifyWithLlmStub(sender, subject, body, classification, extracted);
  if (llmResult.classification !== "other" && llmResult.company && llmResult.role) {
    return llmResult;
  }

  return {
    confidence: 0.4,
    status: "discarded_low_confidence",
    parser: "llm_stub",
    classification: "other",
    ...extracted,
  };
}

function classifyWithLlmStub(
  sender: string,
  subject: string,
  body: string,
  classification: EmailClassification,
  extracted: Pick<ParsedEmailResult, "company" | "role" | "recruiterEmail" | "timestamp">,
): ParsedEmailResult {
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
  // Production path: call an LLM with the prompt contract below and validate JSON before returning it.
  const promptContract = {
    input: "raw email subject, sender, body, and received timestamp",
    output: {
      classification: "applied | interview | rejected | follow_up | other",
      company: "string or null",
      role: "string or null",
      recruiterEmail: "string or null",
      timestamp: "ISO-8601 string or null",
      confidence: "0..1",
    },
  };
  void sender;
  void body;
  void promptContract;

  return {
    confidence: extracted.company && extracted.role && classification !== "other" ? 0.82 : 0.62,
    status: extracted.company && extracted.role && classification !== "other" ? "parsed" : "needs_confirmation",
    parser: openAiConfigured ? "llm" : "llm_stub",
    classification,
    ...extracted,
    reasoning: openAiConfigured
      ? "LLM provider configured; replace stub transport with OpenAI Responses API call."
      : "OPENAI_API_KEY is not configured, so deterministic heuristics produced an LLM-shaped response.",
  };
}

function extractStructuredFields(sender: string, subject: string, body: string) {
  const text = `${subject}\n${body}`;
  const company =
    matchFirst(text, [
      /\bat\s+([A-Z][A-Za-z0-9&.,' -]{1,60})(?:[\n.,]|$)/,
      /\bfrom\s+([A-Z][A-Za-z0-9&.,' -]{1,60})(?:[\n.,]|$)/,
      /\bCompany:\s*([^\n]+)/i,
    ]) ?? companyFromSender(sender);
  const role = matchFirst(text, [
    /\bRole:\s*([^\n]+)/i,
    /\bJob Title:\s*([^\n]+)/i,
    /\b(?:for|to our)\s+(?:the\s+)?([A-Z]?[A-Za-z0-9 /+-]{2,80}?(?:Engineer|Developer|Designer|Manager|Analyst|Scientist|Role|Intern|Specialist|Lead|Director))\b/i,
  ]);

  return {
    company: cleanField(company),
    role: cleanField(role),
    recruiterEmail: sender.toLowerCase(),
  };
}

function matchFirst(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function cleanField(value?: string): string | undefined {
  return value?.replace(/\s+/g, " ").replace(/[.,:;]+$/, "").trim();
}

function companyFromSender(sender: string): string | undefined {
  const domain = sender.split("@").at(-1)?.split(".").at(0);
  if (!domain || ["gmail", "outlook", "greenhouse", "lever", "myworkday", "linkedin", "indeed"].includes(domain)) {
    return undefined;
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
