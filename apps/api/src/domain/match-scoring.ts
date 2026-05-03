import type { JobMatchAnalysis } from "./types.js";

const skillDictionary = [
  "typescript",
  "javascript",
  "react",
  "node",
  "postgresql",
  "aws",
  "docker",
  "kubernetes",
  "python",
  "sql",
  "graphql",
  "redis",
  "leadership",
  "communication",
  "accessibility",
  "security",
  "machine learning",
];

export function generateMatchAnalysis(jobDescription: string, cvText: string): JobMatchAnalysis {
  const descriptionSkills = extractSkills(jobDescription);
  const cvSkills = extractSkills(cvText);
  const strengths = descriptionSkills.filter((skill) => cvSkills.includes(skill));
  const missingSkills = descriptionSkills.filter((skill) => !cvSkills.includes(skill));
  const coverage = descriptionSkills.length === 0 ? 0 : strengths.length / descriptionSkills.length;
  const score = Math.round(Math.max(10, Math.min(100, coverage * 100)));

  return {
    score,
    missingSkills,
    strengths,
    generatedAt: new Date().toISOString(),
    provider: process.env.OPENAI_API_KEY ? "llm" : "heuristic_stub",
  };
}

function extractSkills(text: string): string[] {
  const normalized = text.toLowerCase();
  return skillDictionary.filter((skill) => normalized.includes(skill));
}
