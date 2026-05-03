import assert from "node:assert/strict";
import {
  addAllowlistRule,
  captureFromExtension,
  connectOAuth,
  exportUserData,
  generateMatchScore,
  getInsights,
  ingestEmail,
  listApplications,
  listEmails,
  listOAuthConnections,
  listTimeline,
  syncOAuth,
} from "../handlers.js";

const userId = "automation-demo-user";
const cvText = "Backend engineer with TypeScript, Node.js, PostgreSQL, AWS, queues, REST APIs, and testing experience.";

addAllowlistRule({ userId, type: "domain", value: "acme.example" });
addAllowlistRule({ userId, type: "domain", value: "greenhouse.io" });

const oauthConnection = connectOAuth({ userId, provider: "gmail" });
const historicalSync = await syncOAuth({ userId, provider: "gmail", historicalImportMonths: 6 });

const appliedEmail = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "demo-applied",
  sender: "recruiter@acme.example",
  subject: "Application received for Backend Engineer at Acme",
  body: "Thanks for applying to the Backend Engineer role at Acme.",
  receivedAt: "2026-05-01T09:00:00.000Z",
});
assert.equal(appliedEmail.classification, "applied");
assert.ok(appliedEmail.parsedAppId);

const extensionCapture = captureFromExtension({
  userId,
  title: "Backend Engineer",
  company: "Acme",
  description: "Build TypeScript and Node.js APIs on PostgreSQL, AWS, and queue-based workers.",
  sourceUrl: "https://jobs.example/acme/backend-engineer",
  capturedAt: "2026-05-01T09:05:00.000Z",
});
assert.equal(extensionCapture.appId, appliedEmail.parsedAppId);

const scoredApplication = await generateMatchScore({
  userId,
  appId: appliedEmail.parsedAppId,
  cvText,
});
assert.ok(scoredApplication.matchScore);

const interviewEmail = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "demo-interview",
  sender: "recruiter@acme.example",
  subject: "Interview for Backend Engineer at Acme",
  body: "Can you share availability for the Backend Engineer interview at Acme next week?",
  receivedAt: "2026-05-03T10:00:00.000Z",
});
assert.equal(interviewEmail.classification, "interview");

const rejectionEmail = ingestEmail({
  userId,
  provider: "gmail",
  messageId: "demo-rejected",
  sender: "recruiter@acme.example",
  subject: "Update for Backend Engineer at Acme",
  body: "Unfortunately, Acme will not be moving forward with your Backend Engineer application.",
  receivedAt: "2026-05-10T10:00:00.000Z",
});
assert.equal(rejectionEmail.classification, "rejected");

const applications = listApplications(userId);
const acmeApplication = applications.find((application) => application.appId === appliedEmail.parsedAppId);
assert.ok(acmeApplication);
assert.equal(acmeApplication.company, "Acme");
assert.equal(acmeApplication.role, "Backend Engineer");
assert.deepEqual(acmeApplication.recruiterEmails, ["recruiter@acme.example"]);

const emails = listEmails(userId, acmeApplication.appId);
const timeline = listTimeline(userId, acmeApplication.appId);
const insights = getInsights(userId);
const oauthState = listOAuthConnections(userId);
const exportBundle = exportUserData(userId);

assert.equal(emails.length, 3);
assert.ok(timeline.some((event) => event.type === "extension_capture"));
assert.ok(timeline.some((event) => event.type === "match_scored"));
assert.ok(timeline.some((event) => event.type === "interview"));
assert.ok(timeline.some((event) => event.type === "rejected"));
assert.ok(insights.totals.applications >= 1);
assert.equal(oauthState.connections.length, 1);

console.log(
  JSON.stringify(
    {
      changedCapabilitiesShown: [
        "Gmail OAuth connection metadata and credential readiness",
        "Historical email sync stub",
        "Email classification into applied/interview/rejected",
        "Automatic application upsert and recruiter email linking",
        "Browser extension capture merge",
        "AI-ready match scoring with deterministic fallback",
        "Stored emails linked to the job",
        "Generated application timeline",
        "Response/interview/rejection/ghosting insights",
        "Privacy export includes derived automation data",
      ],
      oauthConnection,
      historicalSync: {
        provider: historicalSync.provider,
        credentialStatus: historicalSync.credentialStatus,
        fetched: historicalSync.fetched,
        processed: historicalSync.processed,
      },
      application: {
        company: acmeApplication.company,
        role: acmeApplication.role,
        status: acmeApplication.status,
        recruiterEmails: acmeApplication.recruiterEmails,
        matchScore: acmeApplication.matchScore,
      },
      relatedEmails: emails.map((email) => ({
        sender: email.sender,
        subject: email.subject,
        classification: email.classification,
      })),
      timeline: timeline.map((event) => ({
        type: event.type,
        source: event.source,
        summary: event.summary,
      })),
      insights,
      exportBundleCounts: {
        applications: exportBundle.applications.length,
        ingestions: exportBundle.ingestions.length,
        emails: exportBundle.emails.length,
        extensionCaptures: exportBundle.extensionCaptures.length,
      },
    },
    null,
    2,
  ),
);
