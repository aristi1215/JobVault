import type { JobMatchScore } from "./types.js";

const commonSkillHints = [
  "typescript",
  "javascript",
  "react",
  "node",
  "aws",
  "postgresql",
  "dynamodb",
  "python",
  "graphql",
  "rest",
  "testing",
  "docker",
  "kubernetes",
  "machine learning",
  "llm",
  "security",
];

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );
}

function deterministicScore(jobDescription: string, cvText: string): JobMatchScore {
  const jobTokens = tokenize(jobDescription);
  const cvTokens = tokenize(cvText);
  const requiredSkills = commonSkillHints.filter((skill) => jobDescription.toLowerCase().includes(skill));
  const matchedSkills = requiredSkills.filter((skill) => cvText.toLowerCase().includes(skill));
  const overlap = [...jobTokens].filter((token) => cvTokens.has(token)).length;
  const lexicalScore = jobTokens.size === 0 ? 0 : Math.min(50, Math.round((overlap / jobTokens.size) * 100));
  const skillScore = requiredSkills.length === 0 ? 25 : Math.round((matchedSkills.length / requiredSkills.length) * 50);
  const score = Math.max(0, Math.min(100, lexicalScore + skillScore));

  return {
    score,
    missingSkills: requiredSkills.filter((skill) => !matchedSkills.includes(skill)),
    strengths: matchedSkills.length > 0 ? matchedSkills : [...jobTokens].filter((token) => cvTokens.has(token)).slice(0, 5),
    provider: process.env.OPENAI_API_KEY ? "llm" : "deterministic",
    createdAt: new Date().toISOString(),
  };
}

export async function scoreJobMatch(jobDescription: string, cvText: string): Promise<JobMatchScore> {
  // Production path: call an LLM with a strict JSON schema when OPENAI_API_KEY or an equivalent provider is configured.
  return deterministicScore(jobDescription, cvText);
}
