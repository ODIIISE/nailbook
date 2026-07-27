/**
 * Test script: send a one-time OTP via SMS.ir.
 *
 * Usage:
 *   cd nailbook
 *   npx tsx scripts/test-sms.ts <phone> [templateId]
 *
 * Examples:
 *   npx tsx scripts/test-sms.ts +989357149901
 *   npx tsx scripts/test-sms.ts 09357149901
 */

import { getSmsProvider, toSmsIrMobile } from "../src/lib/sms";

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("Usage: npx tsx scripts/test-sms.ts <phone>");
    process.exit(1);
  }

  const apiKey = process.env.SMS_IR_API_KEY;
  const templateId = process.env.SMS_IR_TEMPLATE_ID;

  if (!apiKey || !templateId) {
    console.error("Missing SMS_IR_API_KEY or SMS_IR_TEMPLATE_ID");
    process.exit(1);
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  console.log("Phone (input):", phone);
  console.log("Phone (SMS.ir format):", toSmsIrMobile(phone));
  console.log("Code:", code);
  console.log("API key present:", apiKey ? "yes" : "no");
  console.log("Template ID:", templateId);
  console.log("Sending...");

  const provider = getSmsProvider();
  const ok = await provider.sendOTP(phone, code);

  if (ok) {
    console.log("✅ SMS sent successfully (provider returned true)");
  } else {
    console.error("❌ SMS provider returned false");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
