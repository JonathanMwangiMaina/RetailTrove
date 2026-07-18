import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

export type UserRole = "admin" | "vendor" | "customer";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  isApproved?: boolean;
  status?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message || "Login failed");
    }
    const data = await res.json();
    setUser(data);
  }

  async function register(email: string, password: string, name: string, role = "customer") {
    const res = await apiRequest("POST", "/api/auth/register", { email, password, name, role });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message || "Registration failed");
    }
    const data = await res.json();
    setUser(data);
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
