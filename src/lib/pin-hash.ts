import crypto from "crypto";

const ALGO = "sha256";
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.pbkdf2Sync(String(pin).trim(), salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(plaintext: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Support new salted format: "salt:hash"
  if (storedHash.includes(":") && storedHash.length === SALT_LENGTH * 2 + 1 + KEY_LENGTH * 2) {
    const [salt, hash] = storedHash.split(":");
    const computed = crypto.pbkdf2Sync(String(plaintext).trim(), salt, ITERATIONS, KEY_LENGTH, ALGO).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  }

  // Backward compatibility: unsalted SHA-256 (64 hex chars)
  if (storedHash.length === 64) {
    const computed = crypto.createHash(ALGO).update(String(plaintext).trim()).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
  }

  return false;
}
