import { parserTemplateByDomain } from "./types.js";

export interface ParseResult {
  confidence: number;
  status: "parsed" | "needs_confirmation" | "discarded_low_confidence";
  parser: "deterministic" | "llm_fallback";
  eventType?: string;
  inferredCompany?: string;
}

const rejectionSignals = [/unfortunately/i, /regret to inform/i, /not moving forward/i];
const acknowledgementSignals = [/application received/i, /thanks for applying/i, /we received your application/i];
const interviewSignals = [/interview/i, /schedule/i, /availability/i];

function detectEvent(subject: string, body: string): string | undefined {
  const text = `${subject}\n${body}`;
  if (rejectionSignals.some((pattern) => pattern.test(text))) return "rejected";
  if (interviewSignals.some((pattern) => pattern.test(text))) return "interview";
  if (acknowledgementSignals.some((pattern) => pattern.test(text))) return "acknowledged";
  return undefined;
}

export function parseEmailMessage(sender: string, subject: string, body: string): ParseResult {
  const domain = sender.includes("@") ? sender.split("@").at(-1)?.toLowerCase() ?? "" : sender.toLowerCase();
  const knownTemplate = Object.keys(parserTemplateByDomain).find((templateDomain) => domain.endsWith(templateDomain));
  const eventType = detectEvent(subject, body);

  if (knownTemplate && eventType) {
    return {
      confidence: 0.95,
      status: "parsed",
      parser: "deterministic",
      eventType,
    };
  }

  if (eventType) {
    return {
      confidence: 0.76,
      status: "needs_confirmation",
      parser: "llm_fallback",
      eventType,
    };
  }

  return {
    confidence: 0.4,
    status: "discarded_low_confidence",
    parser: "llm_fallback",
  };
}
