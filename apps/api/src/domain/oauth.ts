import { createHash, randomBytes } from "node:crypto";
import { store } from "./store.js";
import type { EmailProviderMessage, OAuthConnection } from "./types.js";

type Provider = OAuthConnection["provider"];

interface OAuthConnectOptions {
  authCode?: string;
  redirectUri?: string;
  historicalImportMonths?: number;
}

export function connectProvider(userId: string, provider: Provider, options: OAuthConnectOptions = {}): OAuthConnection {
  const scopes = provider === "gmail" ? ["gmail.readonly"] : ["Mail.Read"];
  const credentialsReady = Boolean(options.authCode && options.redirectUri && providerCredentialsConfigured(provider));
  const connection: OAuthConnection = {
    provider,
    connected: credentialsReady,
    scopes,
    lastSyncAt: credentialsReady ? new Date().toISOString() : undefined,
    historicalImportStartedAt: new Date().toISOString(),
    historicalImportMonths: options.historicalImportMonths ?? 6,
    watchExpiry: provider === "gmail" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() : undefined,
    tokenSecretRef: credentialsReady ? tokenVaultRef(userId, provider, options.authCode) : undefined,
    authUrl: credentialsReady ? undefined : buildAuthorizationUrl(provider, options.redirectUri),
    syncStatus: credentialsReady ? "ready" : "needs_credentials",
  };

  return store.saveOAuthConnection(userId, connection);
}

export function listConnections(userId: string): OAuthConnection[] {
  return store.listOAuthConnections(userId);
}

export function revokeConnection(userId: string, provider: Provider): { revoked: boolean } {
  return store.revokeOAuthConnection(userId, provider);
}

export function fetchProviderMessages(connection: OAuthConnection): EmailProviderMessage[] {
  if (!connection.connected || !connection.tokenSecretRef) return [];
  const providerLabel = connection.provider === "gmail" ? "Greenhouse" : "Contoso";
  return [
    {
      provider: connection.provider,
      messageId: `${connection.provider}-sample-${Date.now()}`,
      sender: connection.provider === "gmail" ? "jobs@greenhouse.io" : "recruiter@contoso.com",
      subject: "Application received",
      body: `Company: ${providerLabel}\nRole: Software Engineer\nThanks for applying to our Software Engineer role at ${providerLabel}.`,
      receivedAt: new Date().toISOString(),
      rawEmailRef: `${connection.provider}/stubbed-message`,
    },
  ];
}

function providerCredentialsConfigured(provider: Provider): boolean {
  if (provider === "gmail") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

function buildAuthorizationUrl(provider: Provider, redirectUri?: string): string {
  const state = randomBytes(12).toString("base64url");
  const encodedRedirect = encodeURIComponent(redirectUri ?? requiredRedirectUri(provider));
  if (provider === "gmail") {
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID ?? "GOOGLE_CLIENT_ID"}&redirect_uri=${encodedRedirect}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly")}&access_type=offline&prompt=consent&state=${state}`;
  }

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID ?? "MICROSOFT_CLIENT_ID"}&redirect_uri=${encodedRedirect}&response_type=code&scope=${encodeURIComponent("offline_access Mail.Read")}&state=${state}`;
}

function requiredRedirectUri(provider: Provider): string {
  if (provider === "gmail") return process.env.GOOGLE_REDIRECT_URI ?? "https://app.<domain>/api/oauth/google/callback";
  return process.env.MICROSOFT_REDIRECT_URI ?? "https://app.<domain>/api/oauth/microsoft/callback";
}

function tokenVaultRef(userId: string, provider: Provider, authCode?: string): string {
  const digest = createHash("sha256").update(`${userId}:${provider}:${authCode}`).digest("hex").slice(0, 16);
  return `secrets/jobvault/${userId}/${provider}/${digest}`;
}
