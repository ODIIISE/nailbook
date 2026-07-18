import crypto from "crypto";

// ── Plain 4-digit PIN (customers) ──

/** Store a 4-digit PIN as plain text */
export function storePin(pin: string): string {
  return String(pin).trim();
}

// ── Hashed PIN (owner) ──

const ALGO = "sha256";
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Hash a PIN with PBKDF2 (for owner only) */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.pbkdf2Sync(String(pin).trim(), salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
  return `${salt}:${hash}`;
}

// ── Verify (handles both plain and hashed) ──

/** Verify a PIN against a stored value. Works for both plain 4-digit and hashed formats. */
export function verifyPin(plaintext: string, storedValue: string): boolean {
  if (!storedValue || !plaintext) return false;

  const input = String(plaintext).trim();

  // Plain 4-digit PIN — direct comparison
  if (storedValue.length === 4 && /^\d{4}$/.test(storedValue)) {
    return input === storedValue;
  }

  // Salted PBKDF2 format: "salt:hash"
  if (storedValue.includes(":") && storedValue.length === SALT_LENGTH * 2 + 1 + KEY_LENGTH * 2) {
    const [salt, hash] = storedValue.split(":");
    const computed = crypto.pbkdf2Sync(input, salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  }

  // Legacy unsalted SHA-256 (64 hex chars)
  if (storedValue.length === 64) {
    const computed = crypto.createHash(ALGO).update(input).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedValue, "hex"));
  }

  return false;
}
