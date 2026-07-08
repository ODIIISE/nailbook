import crypto from "crypto";
import { supabaseAdmin } from "./supabase/server";

const SECRET = process.env.OWNER_SESSION_SECRET;
if (!SECRET) {
  console.error("FATAL: OWNER_SESSION_SECRET environment variable is not set");
}

export function verifyOwnerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue || !SECRET) return null;

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  // Check if session is not older than 7 days
  const age = Date.now() - parseInt(timestamp);
  if (age > 7 * 24 * 60 * 60 * 1000) return null;

  return userId;
}

export async function verifyOwner(request: { cookies: { get: (name: string) => { value: string } | undefined } }) {
  const cookieValue = request.cookies.get("owner_session")?.value;
  const userId = verifyOwnerSession(cookieValue);
  if (!userId) return null;

  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("role", "owner")
    .single();

  return owner;
}
