const API_KEY = process.env.SMS_IR_API_KEY || "";
const LINE_NUMBER = process.env.SMS_IR_LINE_NUMBER || "";
const MOCK_SMS = true;

export async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
  if (MOCK_SMS || !API_KEY || !LINE_NUMBER) {
    console.log(`[MOCK SMS] Verification code ${code} sent to ${phone}`);
    return true;
  }

  try {
    const { Smsir } = await import("smsir-js");
    const smsir = new Smsir(API_KEY, Number(LINE_NUMBER));
    await smsir.SendVerifyCode(phone, 186497, code);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
