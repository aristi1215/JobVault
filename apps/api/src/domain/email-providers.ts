import type { EmailProvider } from "./types.js";

export interface ProviderMessage {
  provider: Extract<EmailProvider, "gmail" | "outlook">;
  messageId: string;
  sender: string;
  subject: string;
  body: string;
  receivedAt: string;
}

export interface SyncResult {
  provider: Extract<EmailProvider, "gmail" | "outlook">;
  mode: "historical_import" | "incremental";
  credentialStatus: "configured" | "missing_credentials";
  messages: ProviderMessage[];
  nextCursor?: string;
}

const providerEnv = {
  gmail: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"],
  outlook: ["MICROSOFT_GRAPH_CLIENT_ID", "MICROSOFT_GRAPH_CLIENT_SECRET", "MICROSOFT_GRAPH_REDIRECT_URI"],
} as const;

export function missingProviderEnv(provider: Extract<EmailProvider, "gmail" | "outlook">): string[] {
  return providerEnv[provider].filter((key) => !process.env[key]);
}

export function getProviderConfigStatus() {
  return (Object.keys(providerEnv) as Array<Extract<EmailProvider, "gmail" | "outlook">>).map((provider) => {
    const missingEnv = missingProviderEnv(provider);
    return {
      provider,
      ready: missingEnv.length === 0,
      missingEnv,
    };
  });
}

export async function fetchProviderMessages(
  provider: Extract<EmailProvider, "gmail" | "outlook">,
  userId: string,
  mode: "historical_import" | "incremental" = "incremental",
): Promise<SyncResult> {
  const missing = missingProviderEnv(provider);
  if (missing.length > 0) {
    return {
      provider,
      mode,
      credentialStatus: "missing_credentials",
      messages: buildStubMessages(provider, userId, mode),
    };
  }

  // Production adapter boundary: exchange refresh token from Secrets Manager,
  // then call Gmail users.messages or Microsoft Graph /me/messages here.
  return {
    provider,
    mode,
    credentialStatus: "configured",
    messages: [],
    nextCursor: new Date().toISOString(),
  };
}

function buildStubMessages(
  provider: Extract<EmailProvider, "gmail" | "outlook">,
  userId: string,
  mode: "historical_import" | "incremental",
): ProviderMessage[] {
  const now = new Date().toISOString();
  const prefix = `${provider}-${mode}-${userId}`;
  return [
    {
      provider,
      messageId: `${prefix}-1`,
      sender: "jobs@greenhouse.io",
      subject: "Application received for Backend Engineer",
      body: "Thanks for applying to Acme Robotics for the Backend Engineer role.",
      receivedAt: now,
    },
    {
      provider,
      messageId: `${prefix}-2`,
      sender: "recruiter@acmerobotics.example",
      subject: "Backend Engineer interview availability",
      body: "Can you share availability for an interview with Acme Robotics next week?",
      receivedAt: now,
    },
  ];
}
