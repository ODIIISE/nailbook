// Categorical status palettes + labels live in design-tokens.ts
// (STATUS_CONFIG / STATUS_CONFIG_DARK). This file keeps domain rules only.

/** Valid status transitions — must match the backend in api/owner/bookings/status/route.ts */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["reserved", "confirmed", "cancelled"],
  reserved: ["confirmed", "cancelled", "noshow"],
  confirmed: ["in_progress", "cancelled", "noshow"],
  in_progress: ["completed", "cancelled", "noshow"],
  completed: [],
  noshow: [],
  cancelled: ["reserved", "confirmed"],
};
