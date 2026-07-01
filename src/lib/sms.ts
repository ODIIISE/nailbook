import { Smsir } from "smsir-js";

const API_KEY = process.env.SMS_IR_API_KEY || "";
const LINE_NUMBER = process.env.SMS_IR_LINE_NUMBER || "";
const TEMPLATE_ID = process.env.SMS_IR_TEMPLATE_ID || "100000";

let smsir: Smsir | null = null;

function getSmsir(): Smsir {
  if (!smsir) {
    smsir = new Smsir(API_KEY, Number(LINE_NUMBER));
  }
  return smsir;
}

export async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
  try {
    if (!API_KEY || !LINE_NUMBER) {
      console.log(`[MOCK SMS] Code ${code} sent to ${phone}`);
      return true;
    }

    const client = getSmsir();
    const response = await client.SendOTP(phone, Number(TEMPLATE_ID), code);
    console.log(`[SMS] Code sent to ${phone}:`, response);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
