import { estimateSilenceLikelihood } from "./ghosting-score.js";
import type { Application, InsightReport, TimelineEvent } from "./types.js";

export function buildInsightReport(applications: Application[], timelines: Map<string, TimelineEvent[]>): InsightReport {
  const total = applications.length;
  const interviews = applications.filter((app) => app.status === "interview").length;
  const rejections = applications.filter((app) => app.status === "closed").length;
  const responses = applications.filter((app) => ["acknowledged", "screening", "interview", "closed"].includes(app.status)).length;
  const ghosted = applications.filter((app) => {
    const timeline = timelines.get(app.appId) ?? [];
    const hasAcknowledgement = timeline.some((event) => event.type === "applied" || event.type === "follow_up");
    const hasInterviewEvent = timeline.some((event) => event.type === "interview");
    const daysSinceApplied = Math.floor((Date.now() - new Date(app.appliedAt).getTime()) / 86_400_000);
    return estimateSilenceLikelihood({ daysSinceApplied, hasAcknowledgement, hasInterviewEvent, followupsSent: app.followupsSent }).label === "high";
  }).length;

  return {
    generatedAt: new Date().toISOString(),
    totals: { applications: total, responses, interviews, rejections, ghosted },
    rates: {
      responseRate: rate(responses, total),
      interviewRate: rate(interviews, total),
      rejectionRate: rate(rejections, total),
      ghostingRate: rate(ghosted, total),
    },
    insights: generateInsights(applications, interviews, total),
  };
}

function generateInsights(applications: Application[], interviews: number, total: number): string[] {
  if (total === 0) return ["Connect email or capture jobs with the extension to unlock automated insights."];

  const withMatch = applications.filter((app) => app.match);
  const highMatchInterviewCount = withMatch.filter((app) => (app.match?.score ?? 0) >= 75 && app.status === "interview").length;
  const highMatchCount = withMatch.filter((app) => (app.match?.score ?? 0) >= 75).length;
  const sourceCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.source] = (acc[app.source] ?? 0) + 1;
    return acc;
  }, {});
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).at(0);

  return [
    `Interview rate is ${Math.round(rate(interviews, total) * 100)}% across automatically tracked applications.`,
    topSource ? `Most tracked jobs currently come from ${topSource[0]}; compare this with response quality as data grows.` : "",
    highMatchCount > 0
      ? `${highMatchInterviewCount} of ${highMatchCount} high-match applications reached interview stage.`
      : "Add a CV and job descriptions to calculate match-score correlation with interviews.",
  ].filter(Boolean);
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(2));
}
