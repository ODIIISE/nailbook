import { Smsir } from "sms-typescript";

export interface SmsProvider {
  sendOTP(phone: string, code: string): Promise<boolean>;
}

/**
 * Convert any common Iranian mobile format to the 09xxxxxxxxx format
 * expected by SMS.ir (no country code, but keep the leading 0).
 * Examples:
 *   +989357149901  -> 09357149901
 *   00989357149901 -> 09357149901
 *   09357149901    -> 09357149901
 *   9357149901     -> 09357149901
 */
export function toSmsIrMobile(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // strip non-digits
  if (cleaned.startsWith("0098")) cleaned = "0" + cleaned.slice(4);
  else if (cleaned.startsWith("98") && cleaned.length >= 11 && cleaned[2] === "9") cleaned = "0" + cleaned.slice(2);
  else if (cleaned.length === 10 && cleaned.startsWith("9") && !cleaned.startsWith("98")) cleaned = "0" + cleaned;
  if (!cleaned.startsWith("0")) cleaned = "0" + cleaned;
  return cleaned;
}

export function isValidSmsIrMobile(phone: string): boolean {
  const cleaned = toSmsIrMobile(phone);
  return /^09\d{9}$/.test(cleaned);
}

interface SmsirConfig {
  client: Smsir;
  templateId: number;
}

let cachedConfig: SmsirConfig | null | undefined;

function getSmsirConfig(): SmsirConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const apiKey = process.env.SMS_IR_API_KEY;
  const lineNumber = process.env.SMS_IR_LINE_NUMBER;
  const templateId = process.env.SMS_IR_TEMPLATE_ID;

  if (!apiKey || !lineNumber || !templateId) {
    console.warn("[SMS] SMS_IR_API_KEY, SMS_IR_LINE_NUMBER, or SMS_IR_TEMPLATE_ID not set; falling back to console OTP");
    cachedConfig = null;
    return cachedConfig;
  }

  const lineNumberNum = Number(lineNumber);
  if (!Number.isFinite(lineNumberNum)) {
    console.error("[SMS] SMS_IR_LINE_NUMBER is not a valid number:", lineNumber);
    cachedConfig = null;
    return cachedConfig;
  }

  const templateIdNum = Number(templateId);
  if (!Number.isFinite(templateIdNum)) {
    console.error("[SMS] SMS_IR_TEMPLATE_ID is not a valid number:", templateId);
    cachedConfig = null;
    return cachedConfig;
  }

  cachedConfig = { client: new Smsir(apiKey, lineNumberNum), templateId: templateIdNum };
  return cachedConfig;
}

class SmsIrProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    const config = getSmsirConfig();
    if (!config) {
      // Fallback to console when credentials are missing so local/dev flows don't crash.
      console.log(`[SMS] OTP for ${phone}: ${code}`);
      return true;
    }

    const mobile = toSmsIrMobile(phone);
    if (!isValidSmsIrMobile(mobile)) {
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

class ConsoleSmsProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    console.log(`[SMS] OTP for ${phone}: ${code}`);
    return true;
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  if (provider === "console") return new ConsoleSmsProvider();
  // Default to SMS.ir for the Iranian market
  return new SmsIrProvider();
}
