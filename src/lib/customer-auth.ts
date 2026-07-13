import crypto from "crypto";

const SECRET = process.env.CUSTOMER_SESSION_SECRET || process.env.OWNER_SESSION_SECRET || "nailbook-dev-customer-fallback";

export function signCustomerSession(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyCustomerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

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
