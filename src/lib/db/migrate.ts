import { sql } from "@vercel/postgres";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const MIGRATIONS_DIR = join(process.cwd(), "src/db/migrations");
const MIGRATION_LOCK_KEY = "nailbook-schema-migrations";

export interface MigrationResult {
  name: string;
  success: boolean;
  error?: string;
}

async function ensureMigrationsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((file) => file.endsWith(".sql")).sort();
}

/**
 * Older admin builds stored operator-confirmed migration names in `_migrations`.
 * Keep those names visible during the transition so the status endpoint and the
 * runner do not disagree. New writes always go to schema_migrations.
 */
async function getLegacyMigrationNames(client?: { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<{ filename?: string; exists?: boolean }> }> }): Promise<Set<string>> {
  if (client) {
    const { rows: tableRows } = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = '_migrations'
       ) AS exists`
    );
    if (tableRows[0]?.exists !== true) return new Set();
    const { rows } = await client.query("SELECT filename FROM _migrations");
    return new Set(rows.map((row) => row.filename).filter((name): name is string => typeof name === "string"));
  }

  const { rows: tableRows } = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_migrations'
    ) AS exists
  `;
  if (!tableRows[0]?.exists) return new Set();
  const { rows } = await sql`SELECT filename FROM _migrations`;
  return new Set(rows.map((row) => row.filename).filter((name): name is string => typeof name === "string"));
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await sql`SELECT name FROM schema_migrations ORDER BY id`;
  const applied = new Set(rows.map((row) => row.name as string));
  for (const name of await getLegacyMigrationNames()) applied.add(name);
  return applied;
}

/** Run pending migrations atomically and serialize concurrent invocations. */
export async function runMigrations(): Promise<MigrationResult[]> {
  await ensureMigrationsTable();
  const files = await getMigrationFiles();
  const client = await sql.connect();
  const pendingResults: MigrationResult[] = [];

  try {
    await client.query("BEGIN");
    // Transaction-scoped locks are released automatically on COMMIT/ROLLBACK,
    // which is safe with Vercel's pooled/serverless database connections.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      [MIGRATION_LOCK_KEY]
    );

    const { rows: appliedRows } = await client.query("SELECT name FROM schema_migrations ORDER BY id");
    const applied = new Set(appliedRows.map((row: { name: string }) => row.name));
    for (const name of await getLegacyMigrationNames(client)) applied.add(name);

    for (const file of files) {
      if (applied.has(file)) continue;

      const sqlContent = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      try {
        // Execute the complete migration. Splitting on semicolons breaks
        // PL/pgSQL blocks such as migration 015's DO $$ block.
        await client.query(sqlContent);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        pendingResults.push({ name: file, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pendingResults.push({ name: file, success: false, error: message });
        throw error;
      }
    }

    await client.query("COMMIT");
    return pendingResults;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection may already have been closed by the database.
    }

    if (pendingResults.length === 0 || pendingResults[pendingResults.length - 1]?.success !== false) {
      const message = error instanceof Error ? error.message : String(error);
      pendingResults.push({ name: "migration-run", success: false, error: message });
    }
    return pendingResults;
  } finally {
    client.release();
  }
}

export async function getMigrationStatus(): Promise<{
  applied: string[];
  pending: string[];
}> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  return {
    applied: Array.from(applied),
    pending: files.filter((file) => !applied.has(file)),
  };
}
