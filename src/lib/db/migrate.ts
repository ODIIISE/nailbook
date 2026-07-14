import { sql } from "@vercel/postgres";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const MIGRATIONS_DIR = join(process.cwd(), "src/db/migrations");

export interface MigrationResult {
  name: string;
  success: boolean;
  error?: string;
}

/**
 * Ensure the schema_migrations table exists.
 * This table tracks which migrations have been applied.
 */
async function ensureMigrationsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

/**
 * Get list of already applied migration names.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await sql`SELECT name FROM schema_migrations ORDER BY id`;
  return new Set(rows.map((r) => r.name));
}

/**
 * Get all migration files from the migrations directory.
 * Files must be named: NNN_description.sql (e.g., 001_initial_schema.sql)
 */
async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/**
 * Run all pending migrations.
 * Safe to call multiple times — only runs migrations not yet applied.
 */
export async function runMigrations(): Promise<MigrationResult[]> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();
  const results: MigrationResult[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      continue; // Already applied
    }

    const filePath = join(MIGRATIONS_DIR, file);
    const sqlContent = await readFile(filePath, "utf-8");

    try {
      // Split by semicolons and execute each statement
      // Filter out empty statements and comments
      const statements = sqlContent
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        await sql.query(statement);
      }

      // Record migration as applied
      await sql`INSERT INTO schema_migrations (name) VALUES (${file})`;

      results.push({ name: file, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name: file, success: false, error: message });
      console.error(`Migration ${file} failed:`, message);

      // Stop on first failure to prevent partial migrations
      break;
    }
  }

  return results;
}

/**
 * Check migration status without running anything.
 */
export async function getMigrationStatus(): Promise<{
  applied: string[];
  pending: string[];
}> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  return {
    applied: Array.from(applied),
    pending: files.filter((f) => !applied.has(f)),
  };
}
