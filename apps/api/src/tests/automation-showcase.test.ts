import assert from "node:assert/strict";
import {
  addAllowlistRule,
  captureFromExtension,
  connectOAuth,
  getApplicationTimeline,
  getInsights,
  ingestEmail,
  listApplications,
  listIngestionLog,
  listOAuthConnections,
  scoreApplicationMatch,
} from "../handlers.js";

const userId = "automation-showcase-user";

addAllowlistRule({ userId, type: "domain", value: "startup.example" });

const appliedEmail = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "showcase-applied",
  sender: "recruiter@startup.example",
  subject: "Application received",
  body: "Company: Startup Labs\nRole: Product Manager\nThanks for applying to our Product Manager role at Startup Labs.",
  receivedAt: "2026-05-01T12:00:00.000Z",
});

const interviewEmail = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "showcase-interview",
  sender: "recruiter@startup.example",
  subject: "Interview availability",
  body: "Company: Startup Labs\nRole: Product Manager\nCan you schedule an interview next week?",
  receivedAt: "2026-05-03T12:00:00.000Z",
});

assert.equal(appliedEmail.classification, "applied");
assert.equal(interviewEmail.classification, "interview");
assert.equal(interviewEmail.parsedAppId, appliedEmail.parsedAppId);

const emailApplication = listApplications(userId).find((app) => app.appId === appliedEmail.parsedAppId);
assert.equal(emailApplication?.company, "Startup Labs");
assert.equal(emailApplication?.role, "Product Manager");
assert.equal(emailApplication?.status, "interview");
assert.deepEqual(emailApplication?.recruiterEmails, ["recruiter@startup.example"]);
assert.ok(appliedEmail.parsedAppId);

const timeline = getApplicationTimeline(userId, appliedEmail.parsedAppId);
const timelineEventTypes = timeline.map((event) => event.type);
assert.equal(timelineEventTypes.filter((type) => type === "applied").length, 2);
assert.ok(timelineEventTypes.includes("interview"));

const extensionApplication = captureFromExtension({
  userId,
  title: "Platform Engineer",
  company: "Infra Co",
  description: "TypeScript Node PostgreSQL AWS security",
  sourceUrl: "https://example.com/jobs/platform-engineer",
  capturedAt: "2026-05-04T09:00:00.000Z",
});

const scoredApplication = scoreApplicationMatch({
  userId,
  appId: extensionApplication.appId,
  cvText: "Senior engineer with TypeScript, Node, AWS, security, and React experience.",
});

assert.equal(scoredApplication?.match?.provider, "heuristic_stub");
assert.ok(scoredApplication?.match?.strengths.includes("typescript"));
assert.ok(scoredApplication?.match?.missingSkills.includes("postgresql"));

const oauthConnection = connectOAuth({
  userId,
  provider: "gmail",
  redirectUri: "https://app.example.com/api/oauth/google/callback",
});
assert.equal(oauthConnection.syncStatus, "needs_credentials");
assert.ok(oauthConnection.authUrl?.includes("accounts.google.com"));
assert.equal(listOAuthConnections(userId).length, 1);

const ingestions = listIngestionLog(userId);
assert.equal(ingestions.length, 2);
assert.ok(ingestions.every((ingestion) => ingestion.parsedAppId === appliedEmail.parsedAppId));

const insights = getInsights(userId);
assert.equal(insights.totals.applications, 2);
assert.equal(insights.rates.interviewRate, 0.5);
assert.ok(insights.insights.some((insight) => insight.includes("Interview rate")));

// eslint-disable-next-line no-console
console.log("automation showcase test passed", {
  emailApplication,
  extensionApplication: scoredApplication,
  oauthConnection,
  insights,
});
