import crypto from "crypto";
import { sql } from "@vercel/postgres";

const SECRET = process.env.CUSTOMER_SESSION_SECRET || process.env.OWNER_SESSION_SECRET;

function getSecretKey(): string {
  if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CUSTOMER_SESSION_SECRET or OWNER_SESSION_SECRET must be set in production");
    }
    console.warn("No session secret configured — using dev fallback");
    return "nailbook-dev-customer-fallback";
  }
  return SECRET;
}

export function signCustomerSession(userId: string, version: number = 0): string {
  const secretKey = getSecretKey();
  const payload = `${userId}:${Date.now()}:${version}`;
  const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyCustomerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  let secretKey: string;
  try {
    secretKey = getSecretKey();
  } catch {
    return null;
  }

  const parts = cookieValue.split(":");
  if (parts.length !== 4) return null;

  const [userId, timestamp, version, signature] = parts;
  const payload = `${userId}:${timestamp}:${version}`;
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
  if (age > 30 * 24 * 60 * 60 * 1000) return null;

  return userId;
}

export async function verifyCustomerSessionWithVersion(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;

  const userId = verifyCustomerSession(cookieValue);
  if (!userId) return null;

  // Check session version against DB
  const parts = cookieValue.split(":");
  const sessionVersion = parseInt(parts[2]) || 0;

  try {
    const { rows } = await sql`SELECT session_version FROM users WHERE id = ${userId}`;
    if (rows.length === 0) return null;
    const dbVersion = rows[0].session_version || 0;
    if (sessionVersion !== dbVersion) return null;
  } catch {
    return null;
  }

  return userId;
}

export async function incrementSessionVersion(userId: string): Promise<void> {
  try {
    await sql`UPDATE users SET session_version = COALESCE(session_version, 0) + 1 WHERE id = ${userId}`;
  } catch (error) {
    console.error("Failed to increment session version:", error);
  }
}
