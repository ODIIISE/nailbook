import crypto from "crypto";
import { sql } from "@vercel/postgres";

function getSecretKey(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "development") return "nailbook-dev-customer-fallback";
  throw new Error("CUSTOMER_SESSION_SECRET is required in production");
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
  // Accept both 3-part (legacy) and 4-part (versioned) tokens
  if (parts.length !== 3 && parts.length !== 4) return null;

  const userId = parts[0];
  const timestamp = parts[1];
  const signature = parts[parts.length - 1]; // Last part is always signature

  // Build payload: for 3-part it's "userId:timestamp", for 4-part it's "userId:timestamp:version"
  const payloadParts = parts.slice(0, -1); // Everything except signature
  const payload = payloadParts.join(":");

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
  // For 4-part tokens, version is at index 2; for 3-part legacy tokens, version is 0
  const sessionVersion = parts.length === 4 ? (parseInt(parts[2]) || 0) : 0;

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
