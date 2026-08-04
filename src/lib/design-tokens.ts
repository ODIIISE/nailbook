/**
 * Design Tokens — single source of truth for all colors.
 *
 * Rule: No hardcoded hex values in components. Import from here.
 * Semantic tokens map to CSS variables; palette tokens are fixed.
 */

// ── Semantic (maps to CSS vars via Tailwind) ──
export const semantic = {
  // Actions
  action: {
    primary: "var(--foreground)",
    primaryHover: "var(--foreground)",
    onPrimary: "var(--background)",
  },
  // Status
  success: "var(--success)",
  destructive: "var(--destructive)",
} as const;

// ── Timeline Service Palette ──
// Decorative colors for booking blocks — not used in interactive UI.
export const servicePalette = [
  { accent: "#FDA4AF", bg: "#FFF5F6", bgDark: "#2D1518" },
  { accent: "#FCD34D", bg: "#FFFCF0", bgDark: "#2D2A15" },
  { accent: "#6EE7B7", bg: "#F0FDF8", bgDark: "#152D22" },
  { accent: "#93C5FD", bg: "#F0F7FF", bgDark: "#151F2D" },
  { accent: "#C4B5FD", bg: "#F5F3FF", bgDark: "#1F1A2D" },
] as const;

// ── Status Badges ──
export const statusColors = {
  paid: { light: "#2E7D32", dark: "#4CAF50" },
  unpaid: { light: "var(--muted-foreground)", dark: "var(--muted-foreground)" },
  delete: { light: "#C62828", dark: "#EF5350" },
  deleteHover: { light: "#B71C1C", dark: "#E53935" },
  warning: { light: "#E65100", dark: "#FF9800" },
  warningBg: { light: "#FFF3E0", dark: "#2D2A15" },
  warningBorder: { light: "rgba(255,152,0,0.4)", dark: "rgba(255,215,79,0.3)" },
  warningAccent: { light: "#FFB300", dark: "#FFD54F" },
  blockBg: { light: "#FFF8E1", dark: "#2D2A15" },
  blockHover: { light: "#FFF3E0", dark: "#3D3515" },
  blockText: { light: "#E65100", dark: "#FFD54F" },
  blockSubtext: { light: "rgba(245,127,23,0.7)", dark: "rgba(255,213,79,0.7)" },
  blockFaint: { light: "rgba(245,127,23,0.5)", dark: "rgba(255,213,79,0.5)" },
  addon: { light: "#7B1FA2", dark: "#CE93D8" },
  phone: { light: "#1565C0", dark: "#64B5F6" },
  calendar: { light: "#1976D2", dark: "#64B5F6" },
  price: { light: "#E65100", dark: "#FF9800" },
  currentLine: { light: "rgba(91,155,213,0.3)", dark: "rgba(91,155,213,0.4)" },
  currentDot: { light: "rgba(91,155,213,0.4)", dark: "rgba(91,155,213,0.5)" },
} as const;

// ── Chart Colors (admin dashboard) ──
export const chartColors = {
  reserved: { light: "#0A0A0A", dark: "#FAFAFA" },
  confirmed: { light: "#16A34A", dark: "#22C55E" },
  completed: { light: "#7C3AED", dark: "#A78BFA" },
  cancelled: { light: "#DC2626", dark: "#EF4444" },
  bar: { light: "#0A0A0A", dark: "#FAFAFA" },
  axis: { light: "#A3A3A3", dark: "#525252" },
  tooltipBg: { light: "#FFFFFF", dark: "#171717" },
  tooltipBorder: { light: "#E5E5E5", dark: "#262626" },
  tooltipText: { light: "#0A0A0A", dark: "#FAFAFA" },
} as const;

// ── Status Badge Classes (single source of truth for status pills) ──
// Tailwind utility classes for rendered status badges. Uses semantic tokens
// (primary/success/violet/rose/destructive) so badges stay theme-aware.
export const statusBadgeClass: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  reserved: "bg-primary/10 text-primary",
  confirmed: "bg-success/10 text-success",
  in_progress: "bg-amber-500/10 text-amber-600",
  completed: "bg-violet-500/10 text-violet-600",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-amber-500/10 text-amber-600",
};

// ── Theme-aware helper ──
export function themeColor(light: string, dark: string, isDark: boolean): string {
  return isDark ? dark : light;
}
