"use client";

import type { ReactNode } from "react";

interface ReceiptCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Realistic paper receipt/ticket card with:
 * - Paper texture background
 * - Perforated top edge (torn ticket feel)
 * - Dotted perforation line
 * - Paper grain noise overlay
 */
export function ReceiptCard({ children, className = "" }: ReceiptCardProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Main receipt body */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "var(--paper-surface)",
          boxShadow:
            "0 1px 3px rgba(80,70,60,0.08), 0 4px 12px rgba(60,50,40,0.06), 0 8px 24px rgba(50,40,30,0.04)",
        }}
      >
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "var(--paper-tile)",
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
            opacity: 0.5,
          }}
        />

        {/* Top perforated edge — torn ticket look */}
        <div className="relative z-10">
          <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" className="block">
            <pattern id="tear-top" x="0" y="0" width="12" height="8" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="8" r="4" fill="var(--paper-bg)" />
            </pattern>
            <rect width="400" height="8" fill="url(#tear-top)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 px-5 py-4">
          {children}
        </div>

        {/* Dotted perforation line */}
        <div className="relative z-10 mx-5">
          <div className="border-t border-dashed border-black/[0.08]" />
        </div>

        {/* Bottom section with subtle texture */}
        <div className="relative z-10 px-5 py-3">
          <div className="text-center">
            <span className="text-[9px] font-semibold tracking-[3px] uppercase text-black/[0.12]">
              FOREHAND NAIL STUDIO
            </span>
          </div>
        </div>

        {/* Bottom perforated edge */}
        <div className="relative z-10">
          <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" className="block" style={{ transform: "rotate(180deg)" }}>
            <pattern id="tear-bottom" x="0" y="0" width="12" height="8" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="8" r="4" fill="var(--paper-bg)" />
            </pattern>
            <rect width="400" height="8" fill="url(#tear-bottom)" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface ReceiptRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  subValue?: string;
  iconBg?: string;
  iconColor?: string;
}

export function ReceiptRow({ icon, label, value, subValue, iconBg = "rgba(40,136,208,0.08)", iconColor = "#2888d0" }: ReceiptRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <div style={{ color: iconColor }}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-foreground">{value}</div>
        {subValue && (
          <div className="text-[11px] text-muted-foreground">{subValue}</div>
        )}
      </div>
    </div>
  );
}

interface ReceiptTotalProps {
  label: string;
  amount: string;
  currency?: string;
}

export function ReceiptTotal({ label, amount, currency = "تومان" }: ReceiptTotalProps) {
  return (
    <div className="flex items-center justify-between pt-3 mt-1">
      <span className="text-[13px] text-muted-foreground font-medium">{label}</span>
      <span className="text-[20px] font-extrabold text-foreground">
        {amount} <span className="text-[13px] font-medium text-muted-foreground">{currency}</span>
      </span>
    </div>
  );
}
