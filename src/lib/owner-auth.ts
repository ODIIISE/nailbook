import crypto from "crypto";
import { supabaseAdmin } from "./supabase/server";

const SECRET = process.env.OWNER_SESSION_SECRET || "nailbook-owner-secret-key-change-in-production";

export function verifyOwnerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

  if (signature !== expectedSig) return null;

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
