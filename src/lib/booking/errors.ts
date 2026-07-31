/**
 * Structured booking errors.
 *
 * Each error carries a machine-readable code and a Persian user message.
 * The code lets the frontend decide what to do / what to show.
 */

export type BookingErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_PHONE"
  | "INVALID_DATE"
  | "MISSING_FIELDS"
  | "TIME_INVALID"
  | "TIME_RANGE_INVALID"
  | "TIME_OUTSIDE_WORKING_HOURS"
  | "DAY_OFF"
  | "SPAM_DETECTED"
  | "SERVICE_NOT_FOUND"
  | "INVALID_ADDONS"
  | "DURATION_MISMATCH"
  | "SLOT_BLOCKED"
  | "SLOT_TAKEN"
  | "SERVER_ERROR";

export interface BookingErrorPayload {
  code: BookingErrorCode;
  message: string;
  status: number;
  conflict?: boolean;
}

export class BookingError extends Error {
  public readonly code: BookingErrorCode;
  public readonly status: number;
  public readonly conflict?: boolean;

  constructor(payload: BookingErrorPayload) {
    super(payload.message);
    this.code = payload.code;
    this.status = payload.status;
    this.conflict = payload.conflict;
    this.name = "BookingError";
  }

  toJSON() {
    return {
      code: this.code,
      error: this.message,
      conflict: this.conflict,
    };
  }
}

export function createBookingError(code: BookingErrorCode, messageOverride?: string): BookingError {
  const definitions: Record<BookingErrorCode, Omit<BookingErrorPayload, "code">> = {
    UNAUTHORIZED: { message: "غیرمجاز", status: 401 },
    INVALID_PHONE: { message: "شماره موبایل نامعتبر است", status: 400 },
    INVALID_DATE: { message: "تاریخ نامعتبر است", status: 400 },
    MISSING_FIELDS: { message: "اطلاعات ناقص است", status: 400 },
    TIME_INVALID: { message: "ساعت پایان نامعتبر است", status: 400 },
    TIME_RANGE_INVALID: { message: "ساعت پایان باید بعد از ساعت شروع باشد", status: 400 },
    TIME_OUTSIDE_WORKING_HOURS: { message: "ساعت رزرو خارج از ساعات کاری است", status: 409, conflict: true },
    DAY_OFF: { message: "این روز تعطیل است", status: 409, conflict: true },
    SPAM_DETECTED: { message: "", status: 429 },
    SERVICE_NOT_FOUND: { message: "سرویس یافت نشد", status: 400 },
    INVALID_ADDONS: { message: "آپشن نامعتبر", status: 400 },
    DURATION_MISMATCH: { message: "مدت زمان سرویس با زمان انتخابی مطابقت ندارد", status: 400 },
    SLOT_BLOCKED: { message: "این زمان مسدود شده", status: 409, conflict: true },
    SLOT_TAKEN: { message: "این زمان قبلاً رزرو شده", status: 409, conflict: true },
    SERVER_ERROR: { message: "خطای سرور", status: 500 },
  };

  const def = definitions[code];
  return new BookingError({
    code,
    message: messageOverride ?? def.message,
    status: def.status,
    conflict: def.conflict,
  });
}
