"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("nailbook-theme") as Theme | null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  // Initialize lazily from storage/system to avoid a synchronous setState in an effect.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = getStoredTheme();
    return stored || getSystemTheme();
  });
  const [resolved, setResolved] = useState(false);

  // Apply the current theme whenever it changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Mark as resolved and listen for system theme changes once on mount.
  useEffect(() => {
    // This is a one-time hydration guard; suppressing the strict hook rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolved(true);

    // Listen for system theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = getStoredTheme();
      if (!stored) {
        const newTheme = e.matches ? "dark" : "light";
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    // Use View Transitions API for smooth transition if supported
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      const doc = document as Document & {
        startViewTransition?: (callback: () => void) => void;
      };
      doc.startViewTransition?.(() => {
        setThemeState(newTheme);
        applyTheme(newTheme);
        try {
          localStorage.setItem("nailbook-theme", newTheme);
        } catch {}
      });
    } else {
      // Fallback: just apply directly
      setThemeState(newTheme);
      applyTheme(newTheme);
      try {
        localStorage.setItem("nailbook-theme", newTheme);
      } catch {}
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, resolved };
}
