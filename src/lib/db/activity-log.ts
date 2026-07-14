import { sql } from "@vercel/postgres";

export type EventType =
  | "booking_created"
  | "booking_cancelled"
  | "payment_received"
  | "user_registered"
  | "user_deleted"
  | "service_created"
  | "service_updated"
  | "service_deleted"
  | "addon_created"
  | "addon_updated"
  | "addon_deleted"
  | "time_blocked"
  | "time_unblocked"
  | "hours_updated"
  | "salon_updated";

export interface ActivityLog {
  id: string;
  event_type: EventType;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LogEventParams {
  eventType: EventType;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity event.
 * Safe to call — errors are caught and logged, never thrown.
 */
export async function logActivity(params: LogEventParams): Promise<void> {
  try {
    await sql`
      INSERT INTO activity_logs (event_type, entity_type, entity_id, description, metadata)
      VALUES (${params.eventType}, ${params.entityType}, ${params.entityId || null}, ${params.description}, ${JSON.stringify(params.metadata || {})})
    `;
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Fetch activity logs, grouped by date.
 * Returns newest first, limited to 100 most recent.
 */
export async function fetchActivityLogs(
  eventType?: string
): Promise<ActivityLog[]> {
  try {
    if (eventType && eventType !== "all") {
      const { rows } = await sql`
        SELECT * FROM activity_logs
        WHERE event_type = ${eventType}
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return rows as ActivityLog[];
    }

    const { rows } = await sql`
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return rows as ActivityLog[];
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return [];
  }
}

/**
 * Get event type counts for filter tabs.
 */
export async function getActivityCounts(): Promise<Record<string, number>> {
  try {
    const { rows } = await sql`
      SELECT event_type, COUNT(*) as count
      FROM activity_logs
      GROUP BY event_type
    `;

    const counts: Record<string, number> = { all: 0 };
    for (const row of rows) {
      counts[row.event_type] = parseInt(row.count);
      counts.all += parseInt(row.count);
    }
    return counts;
  } catch (error) {
    console.error("Failed to get activity counts:", error);
    return { all: 0 };
  }
}
