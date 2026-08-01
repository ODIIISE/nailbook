"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  // The device preference is the single source of truth. Keep the server and
  // first client render identical; the pre-hydration script handles the CSS
  // class before paint, then this effect synchronizes React state.
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolved, setResolved] = useState(false);

  // Resolve the device preference after hydration and follow live system changes.
  // The pre-hydration script applies the initial class before the first paint.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithDevice = (isDark: boolean) => {
      const nextTheme: Theme = isDark ? "dark" : "light";
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    };

    syncWithDevice(mq.matches);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolved(true);

    const handler = (event: MediaQueryListEvent) => syncWithDevice(event.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    // Safari 13 and older expose the legacy MediaQueryList listener API.
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return { theme, resolved };
}
