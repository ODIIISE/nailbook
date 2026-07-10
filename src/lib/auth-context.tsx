"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface User {
  id: string;
  phone: string;
  name: string;
  role: "customer" | "owner";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<{ success: boolean; error?: string; needsSignup?: boolean }>;
  signup: (phone: string, pin: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "nailbook_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    setIsLoading(false);
  }, []);

  // Login: phone + PIN → verify
  const login = useCallback(async (phone: string, pin: string) => {
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      }

      // If user doesn't exist or has no PIN, suggest signup
      if (res.status === 404 || res.status === 400) {
        return { success: false, error: data.error, needsSignup: true };
      }

      return { success: false, error: data.error || "خطا در ورود" };
    } catch {
      return { success: false, error: "خطای سرور" };
    }
  }, []);

  // Signup: phone + PIN + name → create
  const signup = useCallback(async (phone: string, pin: string, name: string) => {
    try {
      const res = await fetch("/api/auth/create-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, name }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      }

      return { success: false, error: data.error || "خطا در ثبت‌نام" };
    } catch {
      return { success: false, error: "خطای سرور" };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
