"use client";

import { useTheme, toggleTheme as toggleThemeStore, setTheme as setThemeStore } from "@/lib/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

/**
 * Manual theme toggle. Defaults to following the device preference, but a tap
 * switches to an explicit light/dark override (persisted). The side menu offers
 * a "system" option to return to following the device.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved } = useTheme();

  if (!resolved) return null;

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={() => {
        haptic.tap();
        toggleThemeStore();
      }}
      aria-label={isDark ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
      aria-pressed={isDark}
      title={isDark ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

/**
 * Segmented control (system / light / dark) for the side menu.
 */
export function ThemeModeMenu({ onSelect }: { onSelect?: () => void }) {
  const { mode, resolved } = useTheme();

  if (!resolved) return null;

  const options: { value: "system" | "light" | "dark"; label: string }[] = [
    { value: "system", label: "خودکار" },
    { value: "light", label: "روشن" },
    { value: "dark", label: "تاریک" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-muted-foreground px-3">حالت نمایش</p>
      <div className="flex gap-1 px-3">
        {options.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                haptic.tap();
                setThemeStore(opt.value);
                onSelect?.();
              }}
              className={`flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all duration-150 ${
                active
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
