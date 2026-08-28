/**
 * Test script: send a one-time OTP through the app's SMS provider (FarazSMS).
 *
 * Usage:
 *   cd nailbook
 *   npx tsx scripts/test-sms.ts <phone>
 *
 * Examples:
 *   npx tsx scripts/test-sms.ts +989357149901
 *   npx tsx scripts/test-sms.ts 09357149901
 */

import { getSmsProvider, toIranianMobile } from "../src/lib/sms";

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("Usage: npx tsx scripts/test-sms.ts <phone>");
    process.exit(1);
  }

  const apiKey = process.env.FARAZSMS_API_KEY;
  const lineNumber = process.env.FARAZSMS_LINE_NUMBER;
  const patternCode = process.env.FARAZSMS_PATTERN_CODE;
  const consoleProvider = process.env.SMS_PROVIDER === "console";

  if (!consoleProvider && (!apiKey || !lineNumber || !patternCode)) {
    console.error(
      "Missing FARAZSMS_API_KEY, FARAZSMS_LINE_NUMBER, or FARAZSMS_PATTERN_CODE "
      + "(or set SMS_PROVIDER=console for a dry run)"
    );
    process.exit(1);
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  console.log("Phone (input):", phone);
  console.log("Phone (provider format):", toIranianMobile(phone));
  console.log("Code:", code);
  console.log("API key present:", apiKey ? "yes" : "no");
  console.log("Line number:", lineNumber || "(unset)");
  console.log("Pattern code:", patternCode || "(unset)");
  console.log("Sending...");

  const provider = getSmsProvider();
  const result = await provider.sendOTP(phone, code);

  if (result.success) {
    console.log("✅ SMS sent successfully (provider returned success)");
  } else {
    console.error("❌ SMS provider returned failure:", result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
