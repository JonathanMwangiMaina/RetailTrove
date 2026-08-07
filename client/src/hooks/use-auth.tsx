import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "vendor" | "customer";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  isApproved?: boolean;
  status?: string;
  emailVerified?: boolean;
}

/** Error carrying an optional machine-readable `code` (e.g. EMAIL_NOT_VERIFIED). */
export class AuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function authFetch(method: string, url: string, data?: unknown) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(body.message || "Request failed", body.code);
  }
  return body;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await authFetch("POST", "/api/auth/login", { email, password });
    setUser(data);
  }

  async function register(email: string, password: string, name: string, role = "customer") {
    const data = await authFetch("POST", "/api/auth/register", { email, password, name, role });
    // Registration no longer creates an active session — the account is
    // dormant until the email confirmation link is clicked.
    if (!data.requiresVerification) {
      setUser(data);
    }
  }

  async function verifyEmail(token: string) {
    const data = await authFetch("POST", "/api/auth/verify-email", { token });
    setUser(data);
  }

  async function resendVerification(email: string) {
    await authFetch("POST", "/api/auth/resend-verification", { email });
  }

  async function logout() {
    await authFetch("POST", "/api/auth/logout", {});
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, verifyEmail, resendVerification, logout }}
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
