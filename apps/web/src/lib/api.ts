const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jv_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? `Request failed with ${res.status}`);
  }
  return data as T;
}

export interface AuthResponse {
  token: string;
  user: { userId: string; email: string; name: string };
}

export interface Application {
  appId: string;
  userId: string;
  company: string;
  role: string;
  channel: string;
  appliedAt: string;
  status: string;
  sourceUrl?: string;
  lastEventAt: string;
  notes?: string;
  followupsSent: number;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => request<{ userId: string }>("/auth/me"),

  listApplications: () => request<Application[]>("/applications"),

  createApplication: (data: { company: string; role: string; channel: string; appliedAt: string; sourceUrl?: string; notes?: string }) =>
    request<Application>("/applications", { method: "POST", body: JSON.stringify(data) }),

  updateApplication: (appId: string, status: string) =>
    request<Application>(`/applications/${appId}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  deleteApplication: (appId: string) =>
    request<{ deleted: boolean }>(`/applications/${appId}`, { method: "DELETE" }),
};
