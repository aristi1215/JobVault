import type { Application } from "./types.js";

type Tone = "warm" | "neutral" | "brief";

const toneTemplates: Record<Tone, (application: Application) => string> = {
  warm: (application) =>
    `Hi,\n\nI hope you are doing well. I wanted to follow up on my ${application.role} application at ${application.company}, submitted on ${application.appliedAt}. I remain very interested in the role and would appreciate any update on timeline or next steps.\n\nThank you for your time.\n`,
  neutral: (application) =>
    `Hello,\n\nI am following up on my application for ${application.role} at ${application.company} from ${application.appliedAt}. Could you please share any status update when convenient?\n\nBest regards,\n`,
  brief: (application) =>
    `Hello, quick follow-up on my ${application.role} application at ${application.company} (${application.appliedAt}). Any update on next steps would be appreciated. Thank you.\n`,
};

export function buildFollowupDraft(application: Application, tone: Tone): string {
  return toneTemplates[tone](application);
}

export function isFollowupAllowed(lastSentAt: string | null, totalSent: number): { allowed: boolean; reason?: string } {
  if (totalSent >= 5) {
    return { allowed: false, reason: "Reached maximum of five follow-ups for this application." };
  }

  if (!lastSentAt) {
    return { allowed: true };
  }

  const deltaMs = Date.now() - new Date(lastSentAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (deltaMs < sevenDaysMs) {
    return { allowed: false, reason: "Please wait at least seven days between follow-ups." };
  }

  return { allowed: true };
}
