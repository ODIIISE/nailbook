import crypto from "crypto";
import { sql } from "@vercel/postgres";

const SECRET = process.env.OWNER_SESSION_SECRET;

function getSecretKey(): string {
  if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OWNER_SESSION_SECRET must be set in production");
    }
    console.warn("OWNER_SESSION_SECRET not set — using dev fallback");
    return "nailbook-dev-insecure-fallback";
  }
  return SECRET;
}

export function signOwnerSession(userId: string, version: number = 0): string {
  const secretKey = getSecretKey();
  const payload = `${userId}:${Date.now()}:${version}`;
  const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyOwnerSession(cookieValue: string | undefined): string | null {
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
  if (age > 7 * 24 * 60 * 60 * 1000) return null;

  return userId;
}

export async function verifyOwner(request: { cookies: { get: (name: string) => { value: string } | undefined } }) {
  const cookieValue = request.cookies.get("owner_session")?.value;
  const userId = verifyOwnerSession(cookieValue);
  if (!userId) return null;

  const { rows } = await sql`SELECT id FROM users WHERE id = ${userId} AND role = 'owner'`;
  return rows[0] || null;
}
