"use client";

import { useTheme } from "@/lib/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, resolved } = useTheme();

  if (!resolved) return null;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "روشن کردن" : "تاریک کردن"}
      className={className}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
