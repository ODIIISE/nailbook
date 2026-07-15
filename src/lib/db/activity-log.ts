import { sql } from "@vercel/postgres";

export type EventType =
  | "booking_created"
  | "booking_cancelled"
  | "booking_status_changed"
  | "payment_received"
  | "payment_reverted"
  | "user_registered"
  | "user_deleted"
  | "user_pin_reset"
  | "service_created"
  | "service_updated"
  | "service_deleted"
  | "addon_created"
  | "addon_updated"
  | "addon_deleted"
  | "highlight_created"
  | "highlight_updated"
  | "highlight_deleted"
  | "time_blocked"
  | "time_unblocked"
  | "hours_updated"
  | "salon_updated"
  | "owner_login";

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
 * Ensure activity_logs table exists (safe to call multiple times).
 */
async function ensureTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs (event_type)`;
  } catch (error) {
    console.error("Failed to ensure activity_logs table:", error);
  }
}

let tableEnsured = false;

/**
 * Log an activity event.
 * Safe to call — errors are caught and logged, never thrown.
 */
export async function logActivity(params: LogEventParams): Promise<void> {
  try {
    if (!tableEnsured) {
      await ensureTable();
      tableEnsured = true;
    }

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
 * Returns newest first, limited to 200 most recent.
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
        LIMIT 200
      `;
      return rows as ActivityLog[];
    }

    const { rows } = await sql`
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 200
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
