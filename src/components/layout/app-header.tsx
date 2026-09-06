"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSalon } from "@/lib/salon-context";
import { useMenu } from "./menu-context";
import { haptic } from "@/lib/haptics";

/**
 * App top bar. The hamburger only toggles the shared menu state — the menu
 * itself is the single unified <HamburgerMenu /> mounted app-wide in
 * Providers, which renders role-aware content (guest / customer / owner).
 */
export function AppHeader() {
  const { salon } = useSalon();
  const { open: menuOpen, openMenu } = useMenu();

  return (
    <div
      className="sticky top-0 z-30 border-b border-border bg-background"
      style={{
        // Native safe-area: notch + Dynamic Island sit above the title row.
        // padding-top pushes content into the safe zone; the inner row keeps
        // its 52px height so visual rhythm stays identical on non-notch devices.
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="mx-auto flex h-[52px] max-w-lg items-center justify-between px-4">
        <span className="text-body font-bold text-foreground">{salon.name}</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              haptic.tap();
              openMenu();
            }}
            aria-label="منو"
            aria-expanded={menuOpen}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
