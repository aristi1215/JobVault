import assert from "node:assert/strict";
import { addAllowlistRule, captureFromExtension, getApplicationTimeline, getInsights, ingestEmail, scoreApplicationMatch } from "../handlers.js";
import { parseEmailMessage } from "../domain/parser.js";

const deterministic = parseEmailMessage(
  "jobs@greenhouse.io",
  "Application received",
  "Company: Acme\nRole: Backend Engineer\nThanks for applying to our Backend Engineer role at Acme.",
);
assert.equal(deterministic.status, "parsed");
assert.equal(deterministic.parser, "deterministic");
assert.equal(deterministic.classification, "applied");
assert.equal(deterministic.company, "Acme");
assert.equal(deterministic.role, "Backend Engineer");

const fallback = parseEmailMessage(
  "recruiter@startup.example",
  "Quick interview availability",
  "Company: Startup Labs\nRole: Product Manager\nCan you share times next week?",
);
assert.equal(fallback.status, "parsed");
assert.equal(fallback.parser, "llm_stub");
assert.equal(fallback.classification, "interview");

const discard = parseEmailMessage(
  "newsletter@example.com",
  "New jobs this week",
  "Curated roles you might like.",
);
assert.equal(discard.status, "discarded_low_confidence");

const userId = "parser-test-user";
addAllowlistRule({ userId, type: "domain", value: "startup.example" });
const ingestion = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "msg-1",
  sender: "recruiter@startup.example",
  subject: "Application received",
  body: "Company: Startup Labs\nRole: Product Manager\nThanks for applying to our Product Manager role at Startup Labs.",
  receivedAt: "2026-05-01T12:00:00.000Z",
});
assert.equal(ingestion.status, "parsed");
assert.equal(ingestion.classification, "applied");
assert.ok(ingestion.parsedAppId);

const duplicate = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "msg-1",
  sender: "recruiter@startup.example",
  subject: "Application received",
  body: "Company: Startup Labs\nRole: Product Manager\nThanks for applying to our Product Manager role at Startup Labs.",
});
assert.equal(duplicate?.ingestionId, ingestion.ingestionId);

const interview = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "msg-2",
  sender: "recruiter@startup.example",
  subject: "Interview availability",
  body: "Company: Startup Labs\nRole: Product Manager\nCan you schedule an interview next week?",
  receivedAt: "2026-05-03T12:00:00.000Z",
});
assert.equal(interview.parsedAppId, ingestion.parsedAppId);

const timeline = getApplicationTimeline(userId, ingestion.parsedAppId);
assert.ok(timeline.some((event) => event.type === "applied"));
assert.ok(timeline.some((event) => event.type === "interview"));

const captured = captureFromExtension({
  userId,
  title: "Platform Engineer",
  company: "Infra Co",
  description: "We need TypeScript, Node, PostgreSQL, AWS, and security experience.",
  sourceUrl: "https://example.com/jobs/platform-engineer",
});
const scored = scoreApplicationMatch({
  userId,
  appId: captured.appId,
  cvText: "Senior engineer with TypeScript, Node, AWS, security, and React experience.",
});
assert.equal(scored?.match?.provider, "heuristic_stub");
assert.ok(scored?.match?.missingSkills.includes("postgresql"));
assert.ok((scored?.match?.score ?? 0) >= 60);

const insights = getInsights(userId);
assert.equal(insights.totals.applications, 2);
assert.ok(insights.rates.responseRate > 0);

// eslint-disable-next-line no-console
console.log("parser tests passed");
