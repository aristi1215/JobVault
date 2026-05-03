import { store } from "./store.js";
import type { OAuthConnection } from "./types.js";

type Provider = OAuthConnection["provider"];

const providerConfig: Record<Provider, { authBaseUrl: string; clientIdEnv: string; clientSecretEnv: string; redirectEnv: string }> = {
  gmail: {
    authBaseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    redirectEnv: "GOOGLE_OAUTH_REDIRECT_URI",
  },
  outlook: {
    authBaseUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    clientIdEnv: "MICROSOFT_GRAPH_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_GRAPH_CLIENT_SECRET",
    redirectEnv: "MICROSOFT_GRAPH_REDIRECT_URI",
  },
};

function missingEnv(provider: Provider): string[] {
  const config = providerConfig[provider];
  return [config.clientIdEnv, config.clientSecretEnv, config.redirectEnv].filter((name) => !process.env[name]);
}

function buildAuthUrl(provider: Provider): string | undefined {
  const config = providerConfig[provider];
  const clientId = process.env[config.clientIdEnv];
  const redirectUri = process.env[config.redirectEnv];
  if (!clientId || !redirectUri) return undefined;
  const scopes = provider === "gmail" ? "https://www.googleapis.com/auth/gmail.readonly" : "offline_access Mail.Read";
  const url = new URL(config.authBaseUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export function connectProvider(userId: string, provider: Provider): OAuthConnection {
  const scopes = provider === "gmail" ? ["gmail.readonly"] : ["Mail.Read"];
  const requiredEnv = missingEnv(provider);
  const updated: OAuthConnection = {
    provider,
    connected: true,
    credentialStatus: requiredEnv.length === 0 ? "configured" : "missing_credentials",
    scopes,
    lastSyncAt: new Date().toISOString(),
    watchExpiry: provider === "gmail" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() : undefined,
    secureTokenRef: requiredEnv.length === 0 ? `secrets-manager://${userId}/${provider}/refresh-token` : undefined,
    historicalImportMonths: 6,
    authUrl: buildAuthUrl(provider),
    requiredEnv,
  };

  return store.saveOAuthConnection(userId, updated);
}

export function listConnections(userId: string): OAuthConnection[] {
  return store.listOAuthConnections(userId);
}

export function revokeConnection(userId: string, provider: Provider): { revoked: boolean } {
  return store.revokeOAuthConnection(userId, provider);
}
