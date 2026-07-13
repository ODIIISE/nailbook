import crypto from "crypto";

const ALGO = "sha256";

export function hashPin(pin: string): string {
  return crypto.createHash(ALGO).update(String(pin).trim()).digest("hex");
}

export function verifyPin(plaintext: string, storedHash: string): boolean {
  if (!storedHash || storedHash.length !== 64) return false;
  const computed = hashPin(plaintext);
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
}
