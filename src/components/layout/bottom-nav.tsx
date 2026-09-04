"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { IconHouseBlank, IconReceipt, IconSmilingGirl } from "@/components/ui/icons";
import type { SVGProps } from "react";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "خانه", Icon: IconHouseBlank },
  { href: "/bookings", label: "نوبت‌ها", Icon: IconReceipt },
  { href: "/profile", label: "پروفایل", Icon: IconSmilingGirl },
];

/**
 * Customer bottom tab bar — warm, calm, consumer-grade.
 * Active = filled icon + bold label (never color alone: weight differs too).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="ناوبری اصلی"
    >
      <div className="mx-auto flex w-full max-w-[var(--frame-max-w)] items-stretch">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => haptic.tap()}
              aria-current={active ? "page" : undefined}
              className="relative flex h-16 flex-1 flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <Icon
                className={`h-[22px] w-[22px] ${active ? "text-foreground" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={`text-[11px] leading-none ${active ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
