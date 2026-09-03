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
