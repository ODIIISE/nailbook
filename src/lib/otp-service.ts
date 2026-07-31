import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { getSmsProvider } from "./sms";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

// Per-phone send rate limiting (cooldown between sends)
const SEND_COOLDOWN_MS = 60 * 1000; // 1 minute

export interface OtpRecord {
  id: string;
  phone: string;
  code: string;
  expires_at: string;
  attempts: number;
  created_at: string;
}

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function upsertOtp(phone: string, code: string, expiresAt: string): Promise<OtpRecord> {
  const { rows } = await sql`
    INSERT INTO otps (phone, code, expires_at, attempts)
    VALUES (${phone}, ${code}, ${expiresAt}, 0)
    ON CONFLICT (phone) DO UPDATE
    SET code = EXCLUDED.code,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        created_at = NOW()
    RETURNING id, phone, code, expires_at, attempts, created_at
  `;
  return rows[0] as OtpRecord;
}

export async function findOtp(phone: string): Promise<OtpRecord | null> {
  const { rows } = await sql`SELECT id, phone, code, expires_at, attempts, created_at FROM otps WHERE phone = ${phone}`;
  return (rows[0] as OtpRecord | undefined) || null;
}

export async function incrementOtpAttempts(phone: string): Promise<void> {
  await sql`UPDATE otps SET attempts = attempts + 1 WHERE phone = ${phone}`;
}

export async function deleteOtp(phone: string, otpId?: string, code?: string): Promise<void> {
  if (otpId && code) {
    // The row id is stable across ON CONFLICT updates, so also match the
    // generated code or a newer concurrent OTP could be deleted.
    await sql`DELETE FROM otps WHERE id = ${otpId} AND phone = ${phone} AND code = ${code}`;
    return;
  }
  if (otpId) {
    await sql`DELETE FROM otps WHERE id = ${otpId} AND phone = ${phone}`;
    return;
  }
  await sql`DELETE FROM otps WHERE phone = ${phone}`;
}

export async function canSendOtp(phone: string): Promise<{ allowed: boolean; error?: string }> {
  const record = await findOtp(phone);
  if (!record) return { allowed: true };

  const now = Date.now();
  const createdAt = new Date(record.created_at).getTime();
  if (now - createdAt < SEND_COOLDOWN_MS) {
    return { allowed: false, error: "لطفاً چند لحظه صبر کنید" };
  }

  // Simple per-phone window: if the record has been resent too many times without a window reset,
  // we count based on creation time. For stricter limits, store a separate counter table.
  // Here we use created_at as a proxy; the frontend should not be able to abuse this beyond
  // the IP rate limit in the route.
  return { allowed: true };
}

export async function sendOtp(phone: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const rateCheck = await canSendOtp(phone);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error };
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
    const provider = getSmsProvider();

    // Write OTP to DB first, THEN send SMS.
    // Previously these ran in parallel via Promise.all, but that caused a bug:
    // if SMS failed, the OTP record was already written, and the 60s cooldown
    // blocked retries. Sequential execution fixes this.
    const otpRecord = await upsertOtp(phone, code, expiresAt);
    if (!otpRecord) {
      return { success: false, error: "خطا در ذخیره‌سازی کد" };
    }

    const smsResult = await provider.sendOTP(phone, code);
    if (!smsResult.success) {
      // Rollback the OTP record so the cooldown doesn't block retries
      // Delete only the record created by this send attempt. A concurrent
      // request may already have replaced it with a newer valid OTP.
      await deleteOtp(phone, otpRecord.id, otpRecord.code).catch(() => {});
      return { success: false, error: smsResult.error || "خطا در ارسال پیامک" };
    }
    return { success: true, code };
  } catch (error) {
    console.error("sendOtp error:", error);
    return { success: false, error: "خطای سرور" };
  }
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: string;
  locked?: boolean;
}

export async function verifyOtp(phone: string, inputCode: string): Promise<VerifyOtpResult> {
  const trimmedCode = inputCode.trim();

  // Try to atomically consume a valid, non-expired OTP that hasn't been locked.
  // If a matching record exists, this DELETE prevents concurrent reuse.
  const { rows: deleted } = await sql`
    DELETE FROM otps
    WHERE phone = ${phone}
      AND code = ${trimmedCode}
      AND expires_at > NOW()
      AND attempts < ${MAX_ATTEMPTS}
    RETURNING id
  `;

  if (deleted.length > 0) {
    return { valid: true };
  }

  // The code was wrong, expired, maxed out, or already used.
  // Inspect the remaining record to return a helpful error.
  const { rows } = await sql`SELECT attempts, expires_at FROM otps WHERE phone = ${phone}`;
  if (rows.length === 0) {
    return { valid: false, error: "کد نامعتبر است" };
  }

  const record = rows[0];

  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, error: "تعداد تلاش‌ها بیش از حد مجاز است", locked: true };
  }

  const now = new Date();
  const expiresAt = new Date(record.expires_at);
  if (now > expiresAt) {
    return { valid: false, error: "کد منقضی شده است" };
  }

  // Wrong code: atomically increment attempts and re-check lock.
  const { rows: updated } = await sql`
    UPDATE otps
    SET attempts = attempts + 1
    WHERE phone = ${phone}
      AND attempts < ${MAX_ATTEMPTS}
    RETURNING attempts
  `;

  if (updated.length === 0) {
    return { valid: false, error: "تعداد تلاش‌ها بیش از حد مجاز است", locked: true };
  }

  return { valid: false, error: "کد نادرست است" };
}
