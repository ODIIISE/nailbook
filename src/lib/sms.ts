export interface SmsSendResult {
  success: boolean;
  error?: string;
  response?: unknown;
}

export interface SmsProvider {
  sendOTP(phone: string, code: string): Promise<SmsSendResult>;
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

  const apiKey = process.env.FARAZSMS_API_KEY?.trim();
  const lineNumber = process.env.FARAZSMS_LINE_NUMBER?.trim();
  const patternCode = process.env.FARAZSMS_PATTERN_CODE?.trim();
  const patternVar = (process.env.FARAZSMS_PATTERN_VAR || "var1").trim();

  if (!apiKey || !lineNumber || !patternCode) {
    console.warn("[SMS] FARAZSMS_API_KEY, FARAZSMS_LINE_NUMBER, or FARAZSMS_PATTERN_CODE not set; falling back to console OTP");
    cachedFarazSmsConfig = null;
    return cachedFarazSmsConfig;
  }

  cachedFarazSmsConfig = { apiKey, lineNumber, patternCode, patternVar };
  return cachedFarazSmsConfig;
}

class FarazSmsProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<SmsSendResult> {
    const config = getFarazSmsConfig();
    if (!config) {
      // Fallback to console when credentials are missing so local/dev flows don't crash.
      console.log(`[SMS] OTP for ${phone}: ${code}`);
      return { success: true };
    }

    const mobile = toIranianMobile(phone);
    if (!isValidIranianMobile(mobile)) {
      console.error("[SMS] Invalid Iranian mobile number:", phone);
      return { success: false, error: "Invalid Iranian mobile number" };
    }

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

      const bodyString = JSON.stringify(payload);
      console.log("[SMS] Sending FarazSMS/IranPayamak verify request:", {
        url: "https://api.iranpayamak.com/ws/v1/sms/pattern",
        recipient: payload.recipient,
        line_number: payload.line_number,
        patternCode: payload.code,
        patternVar: config.patternVar,
        fullBody: bodyString,
      });

      const response = await fetch("https://api.iranpayamak.com/ws/v1/sms/pattern", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Api-Key": config.apiKey,
        },
        body: bodyString,
      });

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
        return { success: false, error: `HTTP ${response.status}: ${responseText}` };
      }

      const status = result.status ?? result.Status;
      const message = result.message ?? result.Message ?? result.result ?? responseText;
      if (status !== undefined && status !== 1 && status !== "1" && status !== "OK" && status !== 200) {
        console.error("[SMS] FarazSMS/IranPayamak returned non-success status:", status, message);
        return { success: false, error: `status ${String(status)}: ${message}` };
      }

      return { success: true, response: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[SMS] Failed to send OTP via FarazSMS:", errorMessage, error);
      return { success: false, error: errorMessage };
    }
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<SmsSendResult> {
    console.log(`[SMS] OTP for ${phone}: ${code}`);
    return { success: true };
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  if (provider === "console") return new ConsoleSmsProvider();
  // Only FarazSMS/IranPayamak is supported now.
  return new FarazSmsProvider();
}
