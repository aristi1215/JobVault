interface GhostingInput {
  daysSinceApplied: number;
  hasAcknowledgement: boolean;
  hasInterviewEvent: boolean;
  followupsSent: number;
}

export function estimateSilenceLikelihood(input: GhostingInput): { score: number; label: "low" | "moderate" | "high" } {
  let score = 0;
  score += Math.min(input.daysSinceApplied / 30, 1) * 0.6;
  score += input.hasAcknowledgement ? -0.15 : 0.1;
  score += input.hasInterviewEvent ? -0.25 : 0;
  score += Math.min(input.followupsSent / 5, 1) * 0.15;

  const normalized = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  if (normalized < 0.35) return { score: normalized, label: "low" };
  if (normalized < 0.7) return { score: normalized, label: "moderate" };
  return { score: normalized, label: "high" };
}
