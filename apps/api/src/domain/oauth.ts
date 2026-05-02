type Provider = "gmail" | "outlook";

interface OAuthConnection {
  provider: Provider;
  connected: boolean;
  scopes: string[];
  lastSyncAt: string;
  watchExpiry?: string;
}

const connections = new Map<string, OAuthConnection[]>();

export function connectProvider(userId: string, provider: Provider): OAuthConnection {
  const current = connections.get(userId) ?? [];
  const scopes = provider === "gmail" ? ["gmail.readonly"] : ["Mail.Read"];
  const updated: OAuthConnection = {
    provider,
    connected: true,
    scopes,
    lastSyncAt: new Date().toISOString(),
    watchExpiry: provider === "gmail" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() : undefined,
  };

  const withoutProvider = current.filter((item) => item.provider !== provider);
  connections.set(userId, [...withoutProvider, updated]);
  return updated;
}

export function listConnections(userId: string): OAuthConnection[] {
  return connections.get(userId) ?? [];
}

export function revokeConnection(userId: string, provider: Provider): { revoked: boolean } {
  const current = connections.get(userId) ?? [];
  const next = current.filter((item) => item.provider !== provider);
  connections.set(userId, next);
  return { revoked: true };
}
