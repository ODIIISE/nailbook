"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof document === "undefined") return () => {};

  const target = document.documentElement;
  const observer = new MutationObserver(callback);
  observer.observe(target, { attributes: true, attributeFilter: ["class"] });

  return () => observer.disconnect();
}

function getSnapshot() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

/**
 * Reactive dark-mode detector.
 *
 * Returns `true` when the root `<html>` element has the `dark` class.
 * The component will re-render whenever the user toggles the theme.
 */
export function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
