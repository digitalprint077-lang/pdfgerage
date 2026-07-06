import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiUrl } from "../utils/api";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  authProvider: "email" | "google";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function normalizeUser(raw: AuthUser | null): AuthUser | null {
  if (!raw) return null;
  return {
    ...raw,
    authProvider: raw.authProvider === "google" ? "google" : "email",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await authFetch("/api/auth/me");
      setUser(normalizeUser(data.user ?? null));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(normalizeUser(data.user));
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const data = await authFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    setUser(normalizeUser(data.user));
  }, []);

  const register = useCallback(async (email: string, password: string, name = "") => {
    const data = await authFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    setUser(normalizeUser(data.user));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still clear local session if the network call fails */
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    const data = await authFetch("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    setUser(normalizeUser(data.user));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithGoogle, register, logout, refresh, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
