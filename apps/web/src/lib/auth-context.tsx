"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, useState, type ReactNode } from "react";
import { api, type AuthResponse } from "./api";

interface User {
  userId: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function saveSession(res: AuthResponse) {
  localStorage.setItem("jv_token", res.token);
  localStorage.setItem("jv_user", JSON.stringify(res.user));
}

let listeners: Array<() => void> = [];
function emitAuthChange() { listeners.forEach((l) => l()); }
function subscribeAuth(cb: () => void) { listeners.push(cb); return () => { listeners = listeners.filter((l) => l !== cb); }; }
function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("jv_user");
  const token = localStorage.getItem("jv_token");
  if (!stored || !token) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedUser = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const [user, setUser] = useState<User | null>(storedUser);
  const loading = false;

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    saveSession(res);
    setUser(res.user);
    emitAuthChange();
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    saveSession(res);
    setUser(res.user);
    emitAuthChange();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("jv_token");
    localStorage.removeItem("jv_user");
    setUser(null);
    emitAuthChange();
  }, []);

  return (
    <AuthContext value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
