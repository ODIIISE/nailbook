import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { SESSION_MAX_AGE_MS } from "./session-config";

function getSecretKey(): string {
  const secret = process.env.SUPER_ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "development") {
    if (!globalThis.__nailbook_super_admin_dev_key) {
      globalThis.__nailbook_super_admin_dev_key = crypto.randomBytes(32).toString("hex");
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

  const timestampMs = Number(timestamp);
  // Reject malformed, zero, and future-issued tokens. NaN or a negative age
  // must never be treated as a valid, non-expired session.
  if (!Number.isSafeInteger(timestampMs) || timestampMs <= 0) return null;
  const age = Date.now() - timestampMs;
  if (age < 0 || age > SESSION_MAX_AGE_MS) return null;

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

export async function setSuperAdminPassword(phone: string, password: string) {
  const hashedPin = hashPin(password);
  const { rows } = await sql`
    UPDATE super_admins SET pin = ${hashedPin} WHERE phone = ${phone} RETURNING id
  `;
  return rows[0]?.id || null;
}

function hashPin(pin: string): string {
  const ALGO = "sha256";
  const ITERATIONS = 100000;
  const KEY_LENGTH = 64;
  const SALT_LENGTH = 16;

  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.pbkdf2Sync(String(pin).trim(), salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(plaintext: string, storedValue: string): boolean {
  if (!storedValue || !plaintext) return false;

  const input = String(plaintext).trim();

  // Numeric PIN up to 8 digits (legacy compatibility - 4 to 8 digits plain).
  if (/^\d{4,8}$/.test(storedValue)) {
    return input === storedValue;
  }

  // PBKDF2 format: "salt:hash"
  const SALT_LENGTH = 16;
  const KEY_LENGTH = 64;

  if (storedValue.includes(":")) {
    const [salt, hash] = storedValue.split(":");
    if (!salt || !hash) return false;
    if (salt.length !== SALT_LENGTH * 2) return false;
    if (hash.length !== KEY_LENGTH * 2) return false;
    const computed = crypto.pbkdf2Sync(input, salt, 100000, KEY_LENGTH, "sha256").toString("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
    } catch {
      return false;
    }
  }

  return false;
}
