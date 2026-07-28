export interface SmsProvider {
  sendOTP(phone: string, code: string): Promise<boolean>;
}

/**
 * Convert any common Iranian mobile format to the 09xxxxxxxxx format
 * expected by Iranian SMS providers.
 * Examples:
 *   +989357149901  -> 09357149901
 *   00989357149901 -> 09357149901
 *   09357149901    -> 09357149901
 *   9357149901     -> 09357149901
 */
export function toIranianMobile(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // strip non-digits
  if (cleaned.startsWith("0098")) cleaned = "0" + cleaned.slice(4);
  else if (cleaned.startsWith("98") && cleaned.length >= 11 && cleaned[2] === "9") cleaned = "0" + cleaned.slice(2);
  else if (cleaned.length === 10 && cleaned.startsWith("9") && !cleaned.startsWith("98")) cleaned = "0" + cleaned;
  if (!cleaned.startsWith("0")) cleaned = "0" + cleaned;
  return cleaned;
}

export function isValidIranianMobile(phone: string): boolean {
  const cleaned = toIranianMobile(phone);
  return /^09\d{9}$/.test(cleaned);
}

// Keep the old aliases for backwards compatibility with existing callers.
export const toSmsIrMobile = toIranianMobile;
export const isValidSmsIrMobile = isValidIranianMobile;

interface FarazSmsConfig {
  apiKey: string;
  lineNumber: string;
  patternCode: string;
  patternVar: string;
}

let cachedFarazSmsConfig: FarazSmsConfig | null | undefined;

function getFarazSmsConfig(): FarazSmsConfig | null {
  if (cachedFarazSmsConfig !== undefined) return cachedFarazSmsConfig;

  const apiKey = process.env.FARAZSMS_API_KEY;
  const lineNumber = process.env.FARAZSMS_LINE_NUMBER;
  const patternCode = process.env.FARAZSMS_PATTERN_CODE;
  const patternVar = process.env.FARAZSMS_PATTERN_VAR || "var1";

  if (!apiKey || !lineNumber || !patternCode) {
    console.warn("[SMS] FARAZSMS_API_KEY, FARAZSMS_LINE_NUMBER, or FARAZSMS_PATTERN_CODE not set; falling back to console OTP");
    cachedFarazSmsConfig = null;
    return cachedFarazSmsConfig;
  }

  cachedFarazSmsConfig = { apiKey, lineNumber, patternCode, patternVar };
  return cachedFarazSmsConfig;
}

class FarazSmsProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    const config = getFarazSmsConfig();
    if (!config) {
      // Fallback to console when credentials are missing so local/dev flows don't crash.
      console.log(`[SMS] OTP for ${phone}: ${code}`);
      return true;
    }

    const mobile = toIranianMobile(phone);
    if (!isValidIranianMobile(mobile)) {
      console.error("[SMS] Invalid Iranian mobile number:", phone);
      return false;
    }

    const timeoutMs = Number(process.env.FARAZSMS_TIMEOUT_MS) || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const attributes: Record<string, string> = {};
      attributes[config.patternVar] = code;

      const payload = {
        code: config.patternCode,
        attributes,
        recipient: mobile,
        line_number: config.lineNumber,
        number_format: "english",
      };

      console.log("[SMS] Sending FarazSMS/IranPayamak verify request:", {
        url: "https://api.iranpayamak.com/ws/v1/sms/pattern",
        recipient: payload.recipient,
        line_number: payload.line_number,
        patternCode: payload.code,
        patternVar: config.patternVar,
        timeoutMs,
      });

      const response = await fetch("https://api.iranpayamak.com/ws/v1/sms/pattern", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Api-Key": config.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const responseText = await response.text();
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }

      console.log("[SMS] FarazSMS/IranPayamak response:", JSON.stringify({ status: response.status, body: result }, null, 2));

      // IranPayamak returns 200 with a status code in the body.
      // Common success indicators: status === 1, result === "OK", or HTTP 200 with messageId.
      if (!response.ok) {
        console.error("[SMS] FarazSMS/IranPayamak returned HTTP", response.status, responseText);
        return false;
      }

      const status = result.status ?? result.Status;
      const message = result.message ?? result.Message ?? result.result ?? responseText;
      if (status !== undefined && status !== 1 && status !== "1" && status !== "OK" && status !== 200) {
        console.error("[SMS] FarazSMS/IranPayamak returned non-success status:", status, message);
        return false;
      }

      return true;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortSignal") {
        console.error(`[SMS] FarazSMS/IranPayamak request timed out after ${timeoutMs}ms`);
      } else {
        console.error("[SMS] Failed to send OTP via FarazSMS:", error);
      }
      return false;
    }
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    console.log(`[SMS] OTP for ${phone}: ${code}`);
    return true;
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  if (provider === "console") return new ConsoleSmsProvider();
  // Only FarazSMS/IranPayamak is supported now.
  return new FarazSmsProvider();
}
