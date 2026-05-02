import assert from "node:assert/strict";
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

// eslint-disable-next-line no-console
console.log("parser tests passed");
