import { z } from "zod";

/**
 * Zod schemas for the booking API.
 *
 * These schemas replace manual validation in the route handler.
 * They also document exactly what the API expects.
 */

const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const bookingRequestSchema = z.object({
  // Phone is validated and normalized in the route; we only ensure it's a non-empty string here.
  phone: z.string().min(1),
  service_id: z.string().min(1),
  date_gregorian: z.string().regex(dateRegex, "date_gregorian must be YYYY-MM-DD"),
  start_time: z.string().regex(timeRegex, "start_time must be HH:MM"),
  end_time: z.string().regex(timeRegex, "end_time must be HH:MM"),
  customer_name: z.string().max(100).optional(),
  selected_addons: z.array(z.string()).default([]),
  date: z.string().optional(),
  // Deprecated: kept only so existing clients don't break; ignored server-side.
  user_id: z.string().optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
