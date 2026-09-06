// Categorical status palettes + labels live in design-tokens.ts
// (STATUS_CONFIG / STATUS_CONFIG_DARK). This file keeps domain rules only.

/** Valid status transitions — must match the backend in api/owner/bookings/status/route.ts */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["reserved", "confirmed", "cancelled"],
  reserved: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["reserved", "confirmed"],
};
