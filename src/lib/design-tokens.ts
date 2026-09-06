/**
 * Design Tokens — single source of truth for data-driven colors.
 *
 * Rule: UI chrome uses semantic CSS tokens (see globals.css). This file only
 * holds categorical palettes: timeline service blocks, chart series, and
 * status badge classes. No hardcoded UI colors in components — import here.
 */

// ── Timeline Service Palette ──
// Decorative colors for booking blocks — not used in interactive UI.
export const servicePalette = [
  { accent: "#FDA4AF", bg: "#FFF5F6", bgDark: "#2D1518" },
  { accent: "#FCD34D", bg: "#FFFCF0", bgDark: "#2D2A15" },
  { accent: "#6EE7B7", bg: "#F0FDF8", bgDark: "#152D22" },
  { accent: "#93C5FD", bg: "#F0F7FF", bgDark: "#151F2D" },
  { accent: "#C4B5FD", bg: "#F5F3FF", bgDark: "#1F1A2D" },
] as const;

// ── Blocked-time (rest) block palette — timeline data colors ──
export const blockedTimePalette = {
  bg: { light: "#FFF8E1", dark: "#1F1A0E" },
  bgHover: { light: "#FFF3E0", dark: "#2A2312" },
  border: { light: "rgba(180,83,9,0.4)", dark: "rgba(245,158,11,0.3)" },
  text: { light: "#B45309", dark: "#F59E0B" },
  textStrong: { light: "rgba(146,64,14,0.95)", dark: "rgba(245,158,11,0.7)" },
  accentBar: { light: "#F59E0B", dark: "#FBBF24" },
} as const;

// ── Booking Status Config (timeline/modal status colors + labels) ──
// Light-mode colors sit on the entry's own pastel bg — several previously
// failed AA contrast (in_progress 3.05, confirmed 3.63, cancelled 4.26).
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "در انتظار", color: "#4B5563", bg: "#F3F4F6" },
  reserved: { label: "رزرو شده", color: "#2563EB", bg: "#EFF6FF" },
  confirmed: { label: "تأیید شده", color: "#047857", bg: "#ECFDF5" },
  in_progress: { label: "در حال انجام", color: "#B45309", bg: "#FFFBEB" },
  completed: { label: "انجام شده", color: "#7C3AED", bg: "#F5F3FF" },
  cancelled: { label: "لغو شده", color: "#B91C1C", bg: "#FEF2F2" },
  no_show: { label: "حضور نیافت", color: "#B45309", bg: "#FFFBEB" },
};

/** Dark-mode text colors for the same statuses — the light hexes sit on the
 * dark popover surface (#0F0F10) at 3.0-4.0:1. Override keys must mirror
 * STATUS_CONFIG. */
export const STATUS_CONFIG_DARK: Record<string, { color: string; bg: string }> = {
  pending: { color: "#9CA3AF", bg: "#1F2937" },
  reserved: { color: "#60A5FA", bg: "#172554" },
  confirmed: { color: "#34D399", bg: "#064E3B" },
  in_progress: { color: "#FBBF24", bg: "#451A03" },
  completed: { color: "#A78BFA", bg: "#2E1065" },
  cancelled: { color: "#F87171", bg: "#450A0A" },
  no_show: { color: "#FBBF24", bg: "#451A03" },
};

// ── Chart Colors (admin dashboard) ──
export const chartColors = {
  reserved: { light: "#18181B", dark: "#FAFAFA" },
  confirmed: { light: "#16A34A", dark: "#22C55E" },
  completed: { light: "#7C3AED", dark: "#A78BFA" },
  cancelled: { light: "#DC2626", dark: "#EF4444" },
  bar: { light: "#18181B", dark: "#FAFAFA" },
  axis: { light: "#A1A1AA", dark: "#52525B" },
  tooltipBg: { light: "#FFFFFF", dark: "#101012" },
  tooltipBorder: { light: "#E4E4E7", dark: "#26262A" },
  tooltipText: { light: "#09090B", dark: "#FAFAFA" },
} as const;

// ── Status Badge Classes (single source of truth for status pills) ──
// Tailwind utility classes for rendered status badges. Uses semantic tokens
// (primary/success/violet/rose/destructive) so badges stay theme-aware.
export const statusBadgeClass: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  reserved: "bg-primary/10 text-primary",
  confirmed: "bg-success/10 text-success",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

// ── Theme-aware helper ──
export function themeColor(light: string, dark: string, isDark: boolean): string {
  return isDark ? dark : light;
}
