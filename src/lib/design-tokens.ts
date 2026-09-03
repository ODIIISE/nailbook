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
  reserved: { light: "#D6471C", dark: "#E25024" },
  confirmed: { light: "#1E7D3C", dark: "#5FBF77" },
  completed: { light: "#7C3AED", dark: "#A78BFA" },
  cancelled: { light: "#C2372B", dark: "#FF6B5E" },
  bar: { light: "#D6471C", dark: "#FF9778" },
  axis: { light: "#8A6A5E", dark: "rgba(255,247,242,0.4)" },
  tooltipBg: { light: "#FFFFFF", dark: "#241410" },
  tooltipBorder: { light: "#EBDCD4", dark: "rgba(255,247,242,0.14)" },
  tooltipText: { light: "#2A130D", dark: "#FFF7F2" },
} as const;

// ── Status Badge Classes (single source of truth for status pills) ──
// Tailwind utility classes for rendered status badges. Uses semantic tokens
// so badges stay theme-aware.
export const statusBadgeClass: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  reserved: "bg-primary/10 text-primary",
  confirmed: "bg-success/10 text-success",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-warning/10 text-warning",
};

// ── Theme-aware helper ──
export function themeColor(light: string, dark: string, isDark: boolean): string {
  return isDark ? dark : light;
}
