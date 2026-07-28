export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "در انتظار", color: "#6B7280", bg: "#F3F4F6" },
  reserved: { label: "رزرو شده", color: "#2563EB", bg: "#EFF6FF" },
  confirmed: { label: "تأیید شده", color: "#059669", bg: "#ECFDF5" },
  in_progress: { label: "در حال انجام", color: "#D97706", bg: "#FFFBEB" },
  completed: { label: "انجام شده", color: "#7C3AED", bg: "#F5F3FF" },
  cancelled: { label: "لغو شده", color: "#DC2626", bg: "#FEF2F2" },
  no_show: { label: "حضور نیافت", color: "#D97706", bg: "#FFFBEB" },
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
