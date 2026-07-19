"use client";

import type { ReactNode } from "react";

interface ReceiptCardProps {
  children: ReactNode;
  barcode?: string;
  stubLabel?: string;
  sideText?: string;
  className?: string;
}

/**
 * Samsung-style ticket receipt:
 * - Top stub (detached, tilted) with barcode
 * - Main card with torn edge, paper texture, realistic shadows
 * - Two separate paper pieces that look torn apart
 */
export function ReceiptCard({
  children,
  barcode = "ADMIT ONE",
  stubLabel = "FOREHAND NAIL STUDIO",
  sideText,
  className = "",
}: ReceiptCardProps) {
  return (
    <div className={`relative ${className}`} style={{ perspective: "800px" }}>
      {/* ═══ TOP STUB (detached, slightly tilted) ═══ */}
      <div
        className="relative mx-auto mb-1 z-10"
        style={{
          width: "85%",
          maxWidth: "320px",
          transform: "rotate(-1.5deg) translateY(4px)",
          transformOrigin: "right center",
        }}
      >
        {/* Paper shadow — detached piece */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "10px 10px 0 0",
            boxShadow:
              "0 1px 2px rgba(80,70,60,0.08), 0 3px 8px rgba(60,50,40,0.06), 0 8px 20px rgba(50,40,30,0.05)",
            zIndex: -1,
          }}
        />
        <div
          className="rounded-t-[10px] overflow-hidden"
          style={{
            background: "var(--paper-surface)",
            padding: "16px 20px 8px",
          }}
        >
          {/* Paper texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "var(--paper-tile)",
              backgroundRepeat: "repeat",
              backgroundSize: "200px 200px",
              opacity: 0.4,
              mixBlendMode: "multiply",
            }}
          />

          {/* Barcode */}
          <div className="relative z-10 flex justify-center gap-[1.5px] mb-2" style={{ height: "28px", alignItems: "flex-end" }}>
            {[2,1,3,1,2,1,1,3,1,2,1,3,1,1,2,1,3,1,2,1,1,3,1,2,1,3,1,2,1,1,3,1,2,1,3,1,1,2,1,3,1,2,1,1,3,1,2,1,3,1,2,1,1,3,1,2,1,3,1,1,2,1,3,1,2,1].map((w, i) => (
              <div
                key={i}
                style={{
                  width: `${w}px`,
                  height: `${24 + Math.random() * 4}px`,
                  background: "var(--foreground)",
                  borderRadius: "0.5px",
                  opacity: 0.12,
                }}
              />
            ))}
          </div>

          {/* Label */}
          <div className="relative z-10 text-center">
            <span
              className="font-semibold tracking-[4px] uppercase"
              style={{
                fontSize: "8px",
                color: "var(--muted-foreground)",
                opacity: 0.5,
              }}
            >
              {stubLabel}
            </span>
          </div>
        </div>

        {/* Torn edge — bottom of stub */}
        <svg
          width="100%"
          height="6"
          viewBox="0 0 320 6"
          preserveAspectRatio="none"
          className="block relative z-10"
          style={{ marginTop: "-1px" }}
        >
          <pattern id="tear-stub" x="0" y="0" width="10" height="6" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="0" r="3" fill="var(--paper-bg)" />
          </pattern>
          <rect width="320" height="6" fill="url(#tear-stub)" />
        </svg>
      </div>

      {/* ═══ MAIN CARD ═══ */}
      <div className="relative mx-auto" style={{ width: "92%", maxWidth: "360px" }}>
        {/* Paper shadow — main card */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "10px",
            boxShadow:
              "0 1px 2px rgba(80,70,60,0.06), 0 2px 6px rgba(60,50,40,0.05), 0 4px 12px rgba(50,40,30,0.04), 0 8px 24px rgba(50,40,30,0.03), 0 16px 48px rgba(50,40,30,0.02)",
            zIndex: -1,
          }}
        />

        <div
          className="rounded-[10px] overflow-hidden relative"
          style={{
            background: "var(--paper-surface)",
          }}
        >
          {/* Paper texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "var(--paper-tile)",
              backgroundRepeat: "repeat",
              backgroundSize: "200px 200px",
              opacity: 0.4,
              mixBlendMode: "multiply",
            }}
          />

          {/* Top edge highlight — paper light catch */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px] z-10"
            style={{
              background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.5) 50%, transparent 95%)",
            }}
          />

          {/* Torn edge — top of main card */}
          <svg
            width="100%"
            height="6"
            viewBox="0 0 360 6"
            preserveAspectRatio="none"
            className="block relative z-10"
          >
            <pattern id="tear-main" x="0" y="0" width="10" height="6" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="6" r="3" fill="var(--paper-bg)" />
            </pattern>
            <rect width="360" height="6" fill="url(#tear-main)" />
          </svg>

          {/* Side text — like Samsung "A New Shape Unfolds" */}
          {sideText && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: "-2px",
                top: "40%",
                transform: "translateY(-50%) rotate(-90deg)",
                transformOrigin: "center",
                fontSize: "7px",
                fontWeight: 500,
                letterSpacing: "2px",
                color: "var(--muted-foreground)",
                opacity: 0.3,
                whiteSpace: "nowrap",
              }}
            >
              {sideText}
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 px-5 py-5">
            {children}
          </div>

          {/* Bottom edge highlight */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] z-10"
            style={{
              background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.3) 50%, transparent 95%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface ReceiptRowProps {
  icon: ReactNode;
  value: string;
  subValue?: string;
  iconBg?: string;
  iconColor?: string;
}

export function ReceiptRow({ icon, value, subValue, iconBg = "rgba(40,136,208,0.08)", iconColor = "#2888d0" }: ReceiptRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <div style={{ color: iconColor }}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-foreground">{value}</div>
        {subValue && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{subValue}</div>
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
    <div className="flex items-center justify-between pt-3 mt-2 border-t border-dashed border-black/[0.06]">
      <span className="text-[13px] text-muted-foreground font-medium">{label}</span>
      <span className="text-[20px] font-extrabold text-foreground">
        {amount} <span className="text-[13px] font-medium text-muted-foreground">{currency}</span>
      </span>
    </div>
  );
}
