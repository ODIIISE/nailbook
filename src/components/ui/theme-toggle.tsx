"use client";

import { useTheme } from "@/lib/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

/**
 * Passive theme indicator kept for compatibility with any future callers.
 * Theme changes are controlled exclusively by the device preference.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved } = useTheme();

  if (!resolved) return null;

  return (
    <span
      className={className}
      role="status"
      aria-label={theme === "dark" ? "حالت تاریک دستگاه" : "حالت روشن دستگاه"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </span>
  );
}
