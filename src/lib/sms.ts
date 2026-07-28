import { FarazSMS, FarazError } from "farazsms";

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
let cachedClient: FarazSMS | null | undefined;

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

function getFarazClient(): FarazSMS | null {
  if (cachedClient !== undefined) return cachedClient;
  const config = getFarazSmsConfig();
  if (!config) { cachedClient = null; return null; }
  cachedClient = new FarazSMS(config.apiKey);
  return cachedClient;
}

class FarazSmsProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<SmsSendResult> {
    const config = getFarazSmsConfig();
    const client = getFarazClient();
    if (!config || !client) {
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

      console.log("[SMS] Sending via official FarazSMS SDK:", {
        patternCode: config.patternCode,
        recipient: mobile,
        lineNumber: config.lineNumber,
        patternVar: config.patternVar,
      });

      const result = await client.sendPattern(
        config.patternCode,
        mobile,
        attributes,
        config.lineNumber
      );

      console.log("[SMS] FarazSMS SDK response:", JSON.stringify(result, null, 2));
      return { success: true, response: result };
    } catch (error) {
      if (error instanceof FarazError) {
        console.error("[SMS] FarazSMS API error:", error.status, error.body);
        return { success: false, error: `HTTP ${error.status}: ${JSON.stringify(error.body)}` };
      }
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
