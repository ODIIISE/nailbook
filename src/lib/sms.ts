export interface SmsProvider {
  sendOTP(phone: string, code: string): Promise<boolean>;
}

/**
 * Convert any common Iranian mobile format to the 9xxxxxxxxx format
 * expected by SMS.ir (no country code, no leading 0).
 * Examples:
 *   +989357149901  -> 9357149901
 *   00989357149901 -> 9357149901
 *   09357149901    -> 9357149901
 *   9357149901     -> 9357149901
 */
export function toSmsIrMobile(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // strip non-digits
  if (cleaned.startsWith("0098")) cleaned = cleaned.slice(4);
  if (cleaned.startsWith("98") && cleaned.length >= 11) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  return cleaned;
}

export function isValidSmsIrMobile(phone: string): boolean {
  const cleaned = toSmsIrMobile(phone);
  return /^9\d{9}$/.test(cleaned);
}

class SmsIrProvider implements SmsProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    const apiKey = process.env.SMS_IR_API_KEY;
    const templateId = process.env.SMS_IR_TEMPLATE_ID;

    if (!apiKey || !templateId) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("SMS_IR_API_KEY and SMS_IR_TEMPLATE_ID must be set in production");
      }
      console.warn("[SMS] SMS_IR_API_KEY or SMS_IR_TEMPLATE_ID not set; falling back to console OTP");
      console.log(`[SMS] OTP for ${phone}: ${code}`);
      return true;
    }

    const mobile = toSmsIrMobile(phone);
    if (!isValidSmsIrMobile(mobile)) {
      console.error("[SMS] Invalid Iranian mobile number:", phone);
      return false;
    }

    const url = "https://api.sms.ir/v1/send/verify";
    const body = {
      mobile,
      templateId: Number(templateId),
      parameters: [
        {
          name: "Code",
          value: code,
        },
      ],
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: { status?: number; message?: string; messageText?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        // non-JSON response
      }

      if (!res.ok) {
        console.error("[SMS] SMS.ir HTTP error:", res.status, text);
        return false;
      }

      // SMS.ir returns status 1 on success
      if (data.status !== 1) {
        console.error("[SMS] SMS.ir returned non-success status:", data);
        return false;
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
