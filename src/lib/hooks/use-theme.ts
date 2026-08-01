"use client";

import { useSyncExternalStore, useEffect } from "react";

type Theme = "light" | "dark";
type ThemeMode = Theme | "system";

const STORAGE_KEY = "nailbook-theme";

interface ThemeSnapshot {
  theme: Theme;
  mode: ThemeMode;
  resolved: boolean;
}

/* ── Module-level store: single source of truth for all useTheme consumers ── */

const listeners = new Set<() => void>();
let snapshot: ThemeSnapshot = { theme: "light", mode: "system", resolved: false };
let initialized = false;

function emit() {
  for (const listener of listeners) listener();
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // storage unavailable — in-memory only
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function apply(theme: Theme, mode: ThemeMode) {
  const commit = () => {
    applyTheme(theme);
    snapshot = { theme, mode, resolved: snapshot.resolved };
    emit();
  };
  // Cross-fade the theme switch when the browser supports View Transitions
  // (globals.css defines ::view-transition-old/new(root) for this). If the
  // transition API throws (edge cases: rapid toggles, during navigation), fall
  // back to applying the theme directly so the switch never silently fails.
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    try {
      const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
      doc.startViewTransition?.(commit);
      return;
    } catch {
      // fall through to the direct commit below
    }
  }
  commit();
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Resolve from the persisted override (else device) and mark hydration done.
  const stored = readStoredMode();
  const mode: ThemeMode = stored ?? "system";
  const theme: Theme = mode === "system" ? getSystemTheme() : mode;
  applyTheme(theme);
  snapshot = { theme, mode, resolved: true };

  // Follow live device changes only while mode is "system".
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (event: MediaQueryListEvent) => {
    if (snapshot.mode === "system") {
      apply(event.matches ? "dark" : "light", "system");
    }
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
  } else {
    // Safari 13 and older expose the legacy MediaQueryList listener API.
    mq.addListener(handler);
  }

  emit();
}

/* ── External store plumbing ── */

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeSnapshot {
  return snapshot;
}

const SERVER_SNAPSHOT: ThemeSnapshot = { theme: "light", mode: "system", resolved: false };

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

/* ── Public API ── */

export function setTheme(mode: ThemeMode) {
  ensureInitialized();
  writeStoredMode(mode);
  apply(mode === "system" ? getSystemTheme() : mode, mode);
}

export function toggleTheme() {
  // setTheme() calls ensureInitialized() itself.
  setTheme(snapshot.theme === "dark" ? "light" : "dark");
}

/**
 * Shared theme hook: every consumer reads the same module-level snapshot, so
 * toggling from the header icon and the side-menu segmented control always stay
 * in sync. Defaults to following the device preference ("system"); a manual
 * override is persisted to localStorage and honored by the pre-hydration script
 * in layout.tsx before first paint.
 */
export function useTheme() {
  useEffect(() => {
    ensureInitialized();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
