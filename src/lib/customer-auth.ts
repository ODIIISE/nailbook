import crypto from "crypto";

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

export function signCustomerSession(userId: string): string {
  const secretKey = getSecretKey();
  const payload = `${userId}:${Date.now()}`;
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
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
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
  if (age > 30 * 24 * 60 * 60 * 1000) return null;

  return userId;
}
