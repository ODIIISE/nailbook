import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { getSmsProvider } from "./sms";
import { resolveSalonId } from "./multi-tenant";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SEND_COOLDOWN_MS = 60 * 1000;

export interface OtpRecord {
  id: string;
  phone: string;
  code: string;
  expires_at: string;
  attempts: number;
  created_at: string;
  salon_id?: string | null;
}

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

async function tenantScope(): Promise<{ salonId: string | null }> {
  return { salonId: await resolveSalonId() };
}

export async function upsertOtp(phone: string, code: string, expiresAt: string): Promise<OtpRecord> {
  const salonId = await resolveSalonId();
  const result = salonId
    ? await sql.query<OtpRecord>(
        `INSERT INTO otps (salon_id, phone, code, expires_at, attempts)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (salon_id, phone) WHERE salon_id IS NOT NULL DO UPDATE
           SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()
         RETURNING id, salon_id, phone, code, expires_at, attempts, created_at`,
        [salonId, phone, code, expiresAt]
      )
    : await sql.query<OtpRecord>(
        `INSERT INTO otps (phone, code, expires_at, attempts)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (phone) WHERE salon_id IS NULL DO UPDATE
           SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()
         RETURNING id, salon_id, phone, code, expires_at, attempts, created_at`,
        [phone, code, expiresAt]
      );
  return result.rows[0] as OtpRecord;
}

export async function findOtp(phone: string): Promise<OtpRecord | null> {
  const scope = await tenantScope();
  const result = scope.salonId
    ? await sql.query<OtpRecord>(
        "SELECT id, salon_id, phone, code, expires_at, attempts, created_at FROM otps WHERE salon_id = $1 AND phone = $2",
        [scope.salonId, phone]
      )
    : await sql.query<OtpRecord>(
        "SELECT id, salon_id, phone, code, expires_at, attempts, created_at FROM otps WHERE salon_id IS NULL AND phone = $1",
        [phone]
      );
  return result.rows[0] || null;
}

export async function incrementOtpAttempts(phone: string): Promise<void> {
  const scope = await tenantScope();
  await sql.query(
    scope.salonId
      ? "UPDATE otps SET attempts = attempts + 1 WHERE salon_id = $1 AND phone = $2"
      : "UPDATE otps SET attempts = attempts + 1 WHERE salon_id IS NULL AND phone = $1",
    scope.salonId ? [scope.salonId, phone] : [phone]
  );
}

export async function deleteOtp(phone: string, otpId?: string, code?: string): Promise<void> {
  const scope = await tenantScope();
  if (otpId && code) {
    // The row id is stable across ON CONFLICT updates, so also match the
    // generated code or a newer concurrent OTP could be deleted.
    if (scope.salonId) {
      await sql.query("DELETE FROM otps WHERE id = $1 AND salon_id = $2 AND phone = $3 AND code = $4", [otpId, scope.salonId, phone, code]);
    } else {
      await sql.query("DELETE FROM otps WHERE id = $1 AND phone = $2 AND code = $3", [otpId, phone, code]);
    }
    return;
  }
  if (otpId) {
    if (scope.salonId) {
      await sql.query("DELETE FROM otps WHERE id = $1 AND salon_id = $2 AND phone = $3", [otpId, scope.salonId, phone]);
    } else {
      await sql.query("DELETE FROM otps WHERE id = $1 AND phone = $2", [otpId, phone]);
    }
    return;
  }
  await sql.query(
    scope.salonId
      ? "DELETE FROM otps WHERE salon_id = $1 AND phone = $2"
      : "DELETE FROM otps WHERE salon_id IS NULL AND phone = $1",
    scope.salonId ? [scope.salonId, phone] : [phone]
  );
}

export async function canSendOtp(phone: string): Promise<{ allowed: boolean; error?: string }> {
  const record = await findOtp(phone);
  if (!record) return { allowed: true };

  if (Date.now() - new Date(record.created_at).getTime() < SEND_COOLDOWN_MS) {
    return { allowed: false, error: "لطفاً چند لحظه صبر کنید" };
  }
  return { allowed: true };
}

export async function sendOtp(phone: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const rateCheck = await canSendOtp(phone);
    if (!rateCheck.allowed) return { success: false, error: rateCheck.error };

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
    const otpRecord = await upsertOtp(phone, code, expiresAt);
    if (!otpRecord) return { success: false, error: "خطا در ذخیره‌سازی کد" };

    const smsResult = await getSmsProvider().sendOTP(phone, code);
    if (!smsResult.success) {
      // Rollback the OTP record so the cooldown doesn't block retries.
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
  const scope = await tenantScope();
  const deleted = scope.salonId
    ? await sql.query(
        `DELETE FROM otps
         WHERE salon_id = $1 AND phone = $2 AND code = $3
           AND expires_at > NOW() AND attempts < $4 RETURNING id`,
        [scope.salonId, phone, trimmedCode, MAX_ATTEMPTS]
      )
    : await sql.query(
        `DELETE FROM otps
         WHERE salon_id IS NULL AND phone = $1 AND code = $2
           AND expires_at > NOW() AND attempts < $3 RETURNING id`,
        [phone, trimmedCode, MAX_ATTEMPTS]
      );

  if (deleted.rows.length > 0) return { valid: true };

  const record = await findOtp(phone);
  if (!record) return { valid: false, error: "کد نامعتبر است" };
  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, error: "تعداد تلاش‌ها بیش از حد مجاز است", locked: true };
  }
  if (new Date() > new Date(record.expires_at)) {
    return { valid: false, error: "کد منقضی شده است" };
  }

  const updated = scope.salonId
    ? await sql.query(
        "UPDATE otps SET attempts = attempts + 1 WHERE salon_id = $1 AND phone = $2 AND attempts < $3 RETURNING attempts",
        [scope.salonId, phone, MAX_ATTEMPTS]
      )
    : await sql.query(
        "UPDATE otps SET attempts = attempts + 1 WHERE salon_id IS NULL AND phone = $1 AND attempts < $2 RETURNING attempts",
        [phone, MAX_ATTEMPTS]
      );
  if (updated.rows.length === 0) {
    return { valid: false, error: "تعداد تلاش‌ها بیش از حد مجاز است", locked: true };
  }
  return { valid: false, error: "کد نادرست است" };
}
