import crypto from "crypto";
import { sql } from "@vercel/postgres";

function getSecretKey(): string {
  const secret = process.env.SUPER_ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "development") {
    if (!globalThis.__nailbook_super_admin_dev_key) {
      globalThis.__nailbook_super_admin_dev_key = require("crypto").randomBytes(32).toString("hex");
    }
    return globalThis.__nailbook_super_admin_dev_key!;
  }
  throw new Error("SUPER_ADMIN_SESSION_SECRET is not set");
}

declare global {
  var __nailbook_super_admin_dev_key: string | undefined;
}

export function signSuperAdminSession(userId: string): string {
  const secretKey = getSecretKey();
  const payload = `${userId}:${Date.now()}`;
  const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifySuperAdminSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  let secretKey: string;
  try {
    secretKey = getSecretKey();
  } catch {
    return null;
  }

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const userId = parts[0];
  const timestamp = parts[1];
  const signature = parts[2];

  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  const age = Date.now() - parseInt(timestamp);
  if (age > 7 * 24 * 60 * 60 * 1000) return null;

  return userId;
}

export async function verifySuperAdmin(request: { cookies: { get: (name: string) => { value: string } | undefined } }) {
  const cookieValue = request.cookies.get("super_admin_session")?.value;
  const userId = verifySuperAdminSession(cookieValue);
  if (!userId) return null;

  const { rows } = await sql`SELECT id FROM super_admins WHERE id = ${userId}`;
  return rows[0] || null;
}

export async function createSuperAdmin(phone: string, pin: string, name?: string) {
  const hashedPin = hashPin(pin);
  const userId = crypto.randomUUID();

  await sql`
    INSERT INTO super_admins (id, phone, pin, name)
    VALUES (${userId}, ${phone}, ${hashedPin}, ${name || null})
  `;

  return userId;
}

export async function verifySuperAdminPin(phone: string, pin: string) {
  const { rows } = await sql`SELECT id, pin FROM super_admins WHERE phone = ${phone}`;
  if (rows.length === 0) return null;

  if (!verifyPin(pin, rows[0].pin)) return null;
  return rows[0].id;
}

// Reuse PIN functions from pin-hash.ts
function hashPin(pin: string): string {
  const ALGO = "sha256";
  const ITERATIONS = 100000;
  const KEY_LENGTH = 64;
  const SALT_LENGTH = 16;

  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.pbkdf2Sync(String(pin).trim(), salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPin(plaintext: string, storedValue: string): boolean {
  if (!storedValue || !plaintext) return false;

  const input = String(plaintext).trim();

  // Plain 4-digit PIN
  if (storedValue.length === 4 && /^\d{4}$/.test(storedValue)) {
    return input === storedValue;
  }

  // PBKDF2 format: "salt:hash"
  const SALT_LENGTH = 16;
  const KEY_LENGTH = 64;
  const ITERATIONS = 100000;
  const ALGO = "sha256";

  if (storedValue.includes(":") && storedValue.length === SALT_LENGTH * 2 + 1 + KEY_LENGTH * 2) {
    const [salt, hash] = storedValue.split(":");
    const computed = crypto.pbkdf2Sync(input, salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  }

  return false;
}
