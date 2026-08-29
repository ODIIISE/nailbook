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

/** Valid status transitions — must match the backend in api/owner/bookings/status/route.ts */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["reserved", "confirmed", "cancelled"],
  reserved: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["reserved", "confirmed"],
};
