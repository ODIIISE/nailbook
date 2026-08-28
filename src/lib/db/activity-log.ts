import { sql } from "@vercel/postgres";
import { waitUntil } from "@vercel/functions";
import { resolveSalonId } from "@/lib/multi-tenant";

export type EventType =
  | "booking_created"
  | "booking_cancelled"
  | "booking_deleted"
  | "booking_status_changed"
  | "payment_received"
  | "payment_reverted"
  | "user_registered"
  | "user_updated"
  | "user_deleted"
  | "user_login"
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
  | "highlight_uploaded"
  | "logo_updated"
  | "time_blocked"
  | "time_unblocked"
  | "hours_updated"
  | "salon_updated"
  | "database_migrated"
  | "owner_login"
  | "owner_login_denied"
  | "login_blocked";

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
    await sql`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS salon_id UUID`;
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
  // Fire-and-forget call sites (`void logActivity(...)`) can be frozen by the
  // serverless runtime right after the response is sent, silently dropping
  // the write. waitUntil keeps the invocation alive until the insert settles.
  const write = writeActivityLog(params);
  try {
    waitUntil(write);
  } catch {
    // waitUntil unavailable outside a request scope — callers awaiting the
    // returned promise still keep the write alive.
  }
  try {
    await write;
  } catch {
    // already logged inside writeActivityLog
  }
}

async function writeActivityLog(params: LogEventParams): Promise<void> {
  try {
    if (!tableEnsured) {
      await ensureTable();
      tableEnsured = true;
    }

    const salonId = await resolveSalonId();
    if (salonId) {
      await sql`
        INSERT INTO activity_logs (event_type, entity_type, entity_id, description, metadata, salon_id)
        VALUES (${params.eventType}, ${params.entityType}, ${params.entityId || null}, ${params.description}, ${JSON.stringify(params.metadata || {})}, ${salonId})
      `;
    } else {
      await sql`
        INSERT INTO activity_logs (event_type, entity_type, entity_id, description, metadata)
        VALUES (${params.eventType}, ${params.entityType}, ${params.entityId || null}, ${params.description}, ${JSON.stringify(params.metadata || {})})
      `;
    }
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Fetch activity logs, grouped by date.
 * Returns newest first, limited to 200 most recent.
 */
export async function fetchActivityLogs(
  eventType?: string,
  before?: string,
  limit = 200
): Promise<ActivityLog[]> {
  try {
    const salonId = await resolveSalonId();
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (salonId) {
      values.push(salonId);
      conditions.push(`salon_id = $${values.length}`);
    }
    if (eventType && eventType !== "all") {
      values.push(eventType);
      conditions.push(`event_type = $${values.length}`);
    }
    if (before && !Number.isNaN(Date.parse(before))) {
      values.push(before);
      conditions.push(`created_at < $${values.length}`);
    }
    const { rows } = await sql.query(
      `SELECT * FROM activity_logs WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT ${Math.min(Math.max(1, Math.floor(limit)), 500)}`,
      values
    );
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
    const salonId = await resolveSalonId();
    const result = salonId
      ? await sql.query("SELECT event_type, COUNT(*) as count FROM activity_logs WHERE salon_id = $1 GROUP BY event_type", [salonId])
      : await sql`SELECT event_type, COUNT(*) as count FROM activity_logs GROUP BY event_type`;
    const { rows } = result;

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
