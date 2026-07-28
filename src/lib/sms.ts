import { Smsir } from "sms-typescript";

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

interface SmsirConfig {
  client: Smsir;
  templateId: number;
}

let cachedSmsirConfig: SmsirConfig | null | undefined;

function getSmsirConfig(): SmsirConfig | null {
  if (cachedSmsirConfig !== undefined) return cachedSmsirConfig;

  const apiKey = process.env.SMS_IR_API_KEY;
  const lineNumber = process.env.SMS_IR_LINE_NUMBER;
  const templateId = process.env.SMS_IR_TEMPLATE_ID;

  if (!apiKey || !lineNumber || !templateId) {
    cachedSmsirConfig = null;
    return cachedSmsirConfig;
  }

  const lineNumberNum = Number(lineNumber);
  if (!Number.isFinite(lineNumberNum)) {
    console.error("[SMS] SMS_IR_LINE_NUMBER is not a valid number:", lineNumber);
    cachedSmsirConfig = null;
    return cachedSmsirConfig;
  }

  const templateIdNum = Number(templateId);
  if (!Number.isFinite(templateIdNum)) {
    console.error("[SMS] SMS_IR_TEMPLATE_ID is not a valid number:", templateId);
    cachedSmsirConfig = null;
    return cachedSmsirConfig;
  }

  cachedSmsirConfig = { client: new Smsir(apiKey, lineNumberNum), templateId: templateIdNum };
  return cachedSmsirConfig;
}

interface FarazSmsConfig {
  apiKey: string;
  lineNumber: string;
  patternCode: string;
  patternVar: string;
}

let cachedFarazSmsConfig: FarazSmsConfig | null | undefined;

function getFarazSmsConfig(): FarazSmsConfig | null {
  if (cachedFarazSmsConfig !== undefined) return cachedFarazSmsConfig;

  const apiKey = process.env.FARAZSMS_API_KEY || process.env.SMS_IR_API_KEY;
  const lineNumber = process.env.FARAZSMS_LINE_NUMBER || process.env.SMS_IR_LINE_NUMBER;
  const patternCode = process.env.FARAZSMS_PATTERN_CODE || process.env.SMS_IR_TEMPLATE_ID;
  const patternVar = process.env.FARAZSMS_PATTERN_VAR || "var1";

  if (!apiKey || !lineNumber || !patternCode) {
    console.warn("[SMS] FARAZSMS_API_KEY, FARAZSMS_LINE_NUMBER, or FARAZSMS_PATTERN_CODE not set; falling back to console OTP");
    cachedFarazSmsConfig = null;
    return cachedFarazSmsConfig;
  }

  cachedFarazSmsConfig = { apiKey, lineNumber, patternCode, patternVar };
  return cachedFarazSmsConfig;
}

class SmsIrProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    const config = getSmsirConfig();
    if (!config) {
      console.log(`[SMS] OTP for ${phone}: ${code}`);
      return true;
    }

    const mobile = toIranianMobile(phone);
    if (!isValidIranianMobile(mobile)) {
      console.error("[SMS] Invalid Iranian mobile number:", phone);
      return false;
    }

    try {
      console.log("[SMS] Sending verify request:", { mobile, templateId: config.templateId, parameters: [{ name: "Code", value: code }] });
      const result = await config.client.sendVerifyCode(mobile, config.templateId, [{ name: "Code", value: code }]);
      console.log("[SMS] SMS.ir response:", JSON.stringify(result, null, 2));

      if (result.status !== 1) {
        console.error("[SMS] SMS.ir returned non-success status:", result.status, result.message);
        return false;
      }

      if (result.data?.messageId) {
        console.log("[SMS] messageId:", result.data.messageId, "cost:", result.data.cost);
      }

      return true;
    } catch (error) {
      console.error("[SMS] Failed to send OTP:", error);
      return false;
    }
  }
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
  if (provider === "smsir") return new SmsIrProvider();
  // Default to FarazSMS/IranPayamak for the Iranian market.
  return new FarazSmsProvider();
}
