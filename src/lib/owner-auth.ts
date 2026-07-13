import crypto from "crypto";
import { sql } from "@vercel/postgres";

const SECRET = process.env.OWNER_SESSION_SECRET;
const SECRET_KEY = SECRET || "nailbook-dev-insecure-fallback";

export function verifyOwnerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  if (!SECRET && process.env.NODE_ENV === "production") {
    console.error("OWNER_SESSION_SECRET must be set in production");
    return null;
  }

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");

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
