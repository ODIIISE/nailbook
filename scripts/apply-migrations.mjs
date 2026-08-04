// Apply pending SQL migrations from src/db/migrations to the database.
// Mirrors src/lib/db/migrate.ts runMigrations() so the tracking table and
// execution semantics stay identical to the app's own migration runner.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "@vercel/postgres";

const MIGRATIONS_DIR = join(process.cwd(), "src/db/migrations");

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const client = await sql.connect();

  let applied = 0;
  let failed = 0;

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      ["nailbook-schema-migrations"]
    );

    const { rows } = await client.query("SELECT name FROM schema_migrations ORDER BY id");
    const done = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (done.has(file)) {
        console.log(`✓ already applied: ${file}`);
        continue;
      }
      const content = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      try {
        await client.query(content);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        console.log(`✓ applied: ${file}`);
        applied++;
      } catch (err) {
        failed++;
        console.error(`✗ FAILED: ${file} — ${err.message}`);
        throw err;
      }
    }

    await client.query("COMMIT");
    console.log(`\nDone. Applied ${applied}, skipped ${files.length - applied - failed}, failed ${failed}.`);
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* connection may be closed */ }
    console.error("Migration run aborted:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await sql.end();
  }
}

main();
