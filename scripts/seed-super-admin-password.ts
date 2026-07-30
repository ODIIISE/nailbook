/**
 * One-time helper to set the super admin password.
 * Run with: POSTGRES_URL=<url> npx tsx scripts/seed-super-admin-password.ts
 *
 * The default phone is "09121234567" — change PHONE below to match the
 * actual super admin you want to update.
 */
import crypto from "crypto";
import { sql } from "@vercel/postgres";

const PHONE = process.env.SUPER_ADMIN_PHONE || "09121234567";
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "ODIIISE7149901";

if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_URL_NON_POOLING) {
  console.warn("⚠️  No POSTGRES_URL env var detected. Vercel Postgres env vars are required.");
}

async function hashPin(pin: string): Promise<string> {
  const SALT_LENGTH = 16;
  const KEY_LENGTH = 64;
  const ITERATIONS = 100000;
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(pin, crypto.randomBytes(SALT_LENGTH).toString("hex"), ITERATIONS, KEY_LENGTH, "sha256", (err, derived) => {
      if (err) reject(err);
      else resolve(crypto.randomBytes(SALT_LENGTH).toString("hex") + ":" + derived.toString("hex"));
    });
  });
}

async function main() {
  console.log(`Hashing password for super admin phone=${PHONE} (${PASSWORD.length} chars)…`);
  const hashed = await hashPin(PASSWORD);
  console.log(`Hashed value length: ${hashed.length}`);

  const { rows } = await sql`
    UPDATE super_admins
    SET pin = ${hashed}
    WHERE phone = ${PHONE}
    RETURNING id, phone, name
  `;

  if (rows.length === 0) {
    console.error(`❌ No super admin found with phone=${PHONE}.`);
    console.error(`Add one first with INSERT INTO super_admins (id, phone, pin, name) values (gen_random_uuid(), '${PHONE}', '${hashed}', 'admin')`);
    process.exit(1);
  }

  console.log(`✅ Updated super admin password for phone=${PHONE}.`);
  console.log(`   id: ${rows[0].id}, name: ${rows[0].name}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
