"use client";

import { useId } from "react";
import { LACQUER_GRADIENTS, type Lacquer } from "@/lib/design-tokens";

interface NailProps {
  lacquer?: string;
  size?: number;
  accent?: string;
  tile?: boolean;
}

/* Signature nail-mark: lacquer gradient glyph, optional tile. */
export function Nail({ lacquer = "pearl", size = 56, accent, tile = true }: NailProps) {
  const [from, to] = LACQUER_GRADIENTS[lacquer as Lacquer] || LACQUER_GRADIENTS.pearl;
  const uid = useId().replace(/:/g, "");
  const mark = (
    <svg width={size * 0.5} height={size * 0.72} viewBox="0 0 40 58" aria-hidden="true">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`h${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M20 2C30 2 37 14 37 30v18c0 5-4 8-8 8H11c-4 0-8-3-8-8V30C3 14 10 2 20 2Z"
        fill={`url(#g${uid})`}
      />
      {accent === "gold" && (
        <path d="M3 44c10-6 24-6 34 0v4c0 5-4 8-8 8H11c-4 0-8-3-8-8Z" fill="#e2c37f" opacity="0.95" />
      )}
      <path
        d="M12 12c3-5 7-6 9-6"
        stroke={`url(#h${uid})`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="13" cy="24" rx="2.2" ry="7" fill="#fff" opacity="0.22" />
    </svg>
  );
  if (!tile) return mark;
  return (
    <span className="nail" style={{ width: size, height: size }}>
      {mark}
    </span>
  );
}

interface MonogramProps {
  name: string;
  lacquer?: string;
  size?: number;
}

/* Initial medallion for artists/users without photos. */
export function Monogram({ name, lacquer = "pearl", size = 44 }: MonogramProps) {
  const [from, to] = LACQUER_GRADIENTS[lacquer as Lacquer] || LACQUER_GRADIENTS.pearl;
  const light = ["pearl", "gold", "nude", "rose"].includes(lacquer);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.4,
        fontWeight: 300,
        background: `radial-gradient(circle at 32% 28%, ${from}, ${to})`,
        color: light ? "#1b1511" : "#f6e9e2",
        boxShadow: "inset 0 1px rgba(255,255,255,.35), 0 6px 20px rgba(0,0,0,.35)",
      }}
    >
      {name === "" ? null : name?.trim()?.[0] || "؟"}
    </span>
  );
}
