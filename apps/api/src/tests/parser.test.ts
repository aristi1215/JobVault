import assert from "node:assert/strict";
import {
  addAllowlistRule,
  captureFromExtension,
  generateMatchScore,
  getInsights,
  ingestEmail,
  listApplications,
  listEmails,
  listTimeline,
  syncOAuth,
} from "../handlers.js";
import { parseEmailMessage } from "../domain/parser.js";

const deterministic = parseEmailMessage(
  "jobs@greenhouse.io",
  "Application received",
  "Thanks for applying to our backend role.",
);
assert.equal(deterministic.status, "parsed");
assert.equal(deterministic.parser, "deterministic");

const fallback = parseEmailMessage(
  "recruiter@startup.example",
  "Quick interview availability",
  "Can you share times next week?",
);
assert.equal(fallback.status, "needs_confirmation");
assert.equal(fallback.parser, "llm_fallback");

const discard = parseEmailMessage(
  "newsletter@example.com",
  "New jobs this week",
  "Curated roles you might like.",
);
assert.equal(discard.status, "discarded_low_confidence");

const classified = parseEmailMessage(
  "recruiter@acme.example",
  "Interview for Senior Backend Engineer at Acme",
  "Can you share availability for the Senior Backend Engineer interview at Acme?",
);
assert.equal(classified.classification, "interview");
assert.equal(classified.extracted.company, "Acme");
assert.equal(classified.extracted.role, "Senior Backend Engineer");

const userId = "automation-test-user";
addAllowlistRule({ userId, type: "domain", value: "acme.example" });

const ingestion = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "msg-1",
  sender: "recruiter@acme.example",
  subject: "Application received for Platform Engineer at Acme",
  body: "Thanks for applying to the Platform Engineer role at Acme.",
  receivedAt: "2026-05-01T10:00:00.000Z",
});
assert.equal(ingestion.status, "parsed");
assert.equal(ingestion.classification, "applied");
assert.ok(ingestion.parsedAppId);

const appsAfterEmail = listApplications(userId);
assert.equal(appsAfterEmail.length, 1);
assert.equal(appsAfterEmail[0]?.company, "Acme");
assert.equal(appsAfterEmail[0]?.role, "Platform Engineer");
assert.deepEqual(appsAfterEmail[0]?.recruiterEmails, ["recruiter@acme.example"]);

const duplicate = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "msg-1",
  sender: "recruiter@acme.example",
  subject: "Application received for Platform Engineer at Acme",
  body: "Thanks for applying to the Platform Engineer role at Acme.",
  receivedAt: "2026-05-01T10:00:00.000Z",
});
assert.equal(duplicate.status, "parsed");
assert.equal(listApplications(userId).length, 1);

const capture = captureFromExtension({
  userId,
  title: "Platform Engineer",
  company: "Acme",
  description: "Build APIs with TypeScript, Node.js, PostgreSQL, and queues.",
  sourceUrl: "https://jobs.example/acme-platform",
  capturedAt: "2026-05-01T11:00:00.000Z",
});
assert.equal(capture.company, "Acme");
assert.equal(listApplications(userId).length, 1);

const score = await generateMatchScore({
  userId,
  appId: ingestion.parsedAppId,
  cvText: "I build Node.js and TypeScript APIs with PostgreSQL, queues, and AWS.",
});
assert.ok(score.matchScore);
assert.ok(score.matchScore.score >= 60);

const interview = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "msg-2",
  sender: "recruiter@acme.example",
  subject: "Interview for Platform Engineer at Acme",
  body: "Can you share availability for the Platform Engineer interview at Acme?",
});
assert.equal(interview.classification, "interview");
assert.equal(listEmails(userId, ingestion.parsedAppId).length, 2);

const timeline = listTimeline(userId, ingestion.parsedAppId);
assert.ok(timeline.some((event) => event.type === "applied"));
assert.ok(timeline.some((event) => event.type === "interview"));

const insights = getInsights(userId);
assert.equal(insights.totals.applications, 1);
assert.equal(insights.totals.interviews, 1);

const syncResult = await syncOAuth({ userId, provider: "gmail", historicalImportMonths: 6 });
assert.equal(syncResult.provider, "gmail");
assert.ok(syncResult.fetched >= 0);

// eslint-disable-next-line no-console
console.log("parser tests passed");
