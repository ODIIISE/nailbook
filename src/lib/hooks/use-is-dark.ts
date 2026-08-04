"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Reactive subscription to whether the document root currently has the `dark`
 * class. Re-renders consumers when the class flips so inline styles derived
 * from the current theme stay in sync.
 */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
