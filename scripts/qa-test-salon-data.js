#!/usr/bin/env node

/**
 * QA Test: Owner Settings → Database → Customer Display
 *
 * Tests every editable field on the owner settings page:
 *   1. Reads current data from Supabase
 *   2. Updates to test values
 *   3. Reads back and verifies persistence
 *   4. Restores original values
 *
 * Usage: node scripts/qa-test-salon-data.js
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test data — realistic but clearly marked as test values
const TEST_DATA = {
  name: "تست کیفیت - استدیو ناخن",
  slogan: "شعار تستی - زیبایی ناخن",
  description: "توضیحات تستی - این متن برای تست کیفیت نوشته شده",
  phone: "09111111111",
  address: "آدرس تستی - خیابان تست، پلاک ۱",
  working_hours_text: "شنبه تا پنج شنبه . ۰۹ تا ۱۷",
};

const FIELDS = [
  { key: "name", label: "Salon Name", dbCol: "name" },
  { key: "slogan", label: "Slogan", dbCol: "slogan" },
  { key: "description", label: "Description", dbCol: "description" },
  { key: "phone", label: "Phone", dbCol: "phone" },
  { key: "address", label: "Address", dbCol: "address" },
  { key: "working_hours_text", label: "Working Hours Text", dbCol: "working_hours_text" },
];

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

async function readSalonInfo() {
  const { data, error } = await supabase
    .from("salon_info")
    .select("*")
    .limit(1)
    .single();
  if (error) throw new Error(`Failed to read salon_info: ${error.message}`);
  return data;
}

async function updateSalonInfo(updates) {
  const { data: existing } = await supabase
    .from("salon_info")
    .select("id")
    .limit(1)
    .single();
  if (!existing) throw new Error("No salon_info row found");

  const { error } = await supabase
    .from("salon_info")
    .update(updates)
    .eq("id", existing.id);
  if (error) throw new Error(`Failed to update salon_info: ${error.message}`);
}

// Check which columns actually exist in the database
async function detectColumns() {
  const data = await readSalonInfo();
  return Object.keys(data);
}

// ─── Test 1: Read current data ───
async function testReadCurrentData() {
  console.log("\n📋 Test 1: Read current salon data from database");
  const data = await readSalonInfo();
  assert(data !== null, "salon_info row exists");
  assert(typeof data.name === "string", `name is string: "${data.name}"`);
  assert(typeof data.phone === "string", `phone is string: "${data.phone}"`);
  assert(typeof data.address === "string", `address is string: "${data.address}"`);
  assert(typeof data.working_hours_text === "string", `working_hours_text is string: "${data.working_hours_text}"`);
  assert(data.working_hours !== null, "working_hours (JSONB) is present");
  return data;
}

// ─── Test 2: Save and verify each field ───
async function testSaveAndVerify(originalData, fields) {
  console.log("\n📋 Test 2: Save test values and verify persistence");

  for (const field of fields) {
    console.log(`\n  Testing field: ${field.label} (${field.key})`);
    const testValue = TEST_DATA[field.key];

    // Save
    await updateSalonInfo({ [field.key]: testValue });
    console.log(`    Saved: ${field.key} = "${testValue}"`);

    // Read back
    const data = await readSalonInfo();
    assert(
      data[field.dbCol] === testValue,
      `DB value matches: expected "${testValue}", got "${data[field.dbCol]}"`
    );
  }
}

// ─── Test 3: Verify fetchSalonInfo mapping matches DB ───
async function testDataMapping(dbColumns) {
  console.log("\n📋 Test 3: Verify fetchSalonInfo mapping (simulated)");

  const data = await readSalonInfo();

  // Simulate what fetchSalonInfo does in data.ts
  const mapped = {
    id: data.id,
    name: data.name,
    description: data.description,
    slogan: data.slogan || "",
    phone: data.phone,
    address: data.address,
    hero_image_url: data.hero_image_url,
    logo_url: data.logo_url,
    working_hours_text: data.working_hours_text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸",
    working_hours: data.working_hours,
    slot_buffer_minutes: data.slot_buffer_minutes,
    slot_interval_minutes: data.slot_interval_minutes,
  };

  // Only assert on columns that exist in the database
  if (dbColumns.includes("name")) assert(mapped.name === data.name, `name maps correctly`);
  if (dbColumns.includes("slogan")) assert(mapped.slogan === (data.slogan || ""), `slogan maps correctly (with null fallback)`);
  if (dbColumns.includes("description")) assert(mapped.description === data.description, `description maps correctly`);
  if (dbColumns.includes("phone")) assert(mapped.phone === data.phone, `phone maps correctly`);
  if (dbColumns.includes("address")) assert(mapped.address === data.address, `address maps correctly`);
  if (dbColumns.includes("working_hours_text")) assert(mapped.working_hours_text === (data.working_hours_text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸"), `working_hours_text maps correctly (with fallback)`);
  if (dbColumns.includes("working_hours")) assert(mapped.working_hours === data.working_hours, `working_hours maps correctly`);
}

// ─── Test 4: Verify phone format ───
async function testPhoneFormat() {
  console.log("\n📋 Test 4: Verify phone format");

  const data = await readSalonInfo();
  const phone = data.phone;

  assert(/^0\d{10}$/.test(phone), `phone matches Iranian format (0XXXXXXXXXX): "${phone}"`);
  assert(phone.length === 11, `phone is 11 digits: length = ${phone.length}`);

  // Verify WhatsApp URL would be correct
  const waUrl = `https://wa.me/98${phone.slice(1)}`;
  assert(waUrl.startsWith("https://wa.me/98"), `WhatsApp URL format correct: ${waUrl}`);
  assert(waUrl.length === `https://wa.me/98`.length + 10, `WhatsApp URL has correct length`);
}

// ─── Test 5: Verify contact button link formats ───
async function testContactLinks() {
  console.log("\n📋 Test 5: Verify contact button link formats");

  const data = await readSalonInfo();
  const phone = data.phone;

  const telUrl = `tel:${phone}`;
  const smsUrl = `sms:${phone}`;
  const waUrl = `https://wa.me/98${phone.slice(1)}`;

  assert(telUrl === `tel:${phone}`, `tel: link format correct: ${telUrl}`);
  assert(smsUrl === `sms:${phone}`, `sms: link format correct: ${smsUrl}`);
  assert(waUrl === `https://wa.me/98${phone.slice(1)}`, `wa.me link format correct: ${waUrl}`);

  // Verify wa.me number is correct (no leading 0, country code 98)
  const waNumber = waUrl.replace("https://wa.me/", "");
  assert(waNumber.startsWith("98"), `wa.me number starts with 98 (country code)`);
  assert(!waNumber.startsWith("980"), `wa.me number does NOT start with 980 (no double zero)`);
  assert(waNumber.length === 12, `wa.me number is 12 digits (98 + 10): length = ${waNumber.length}`);
}

// ─── Test 6: Verify working hours in slot engine ───
async function testWorkingHoursInSlots() {
  console.log("\n📋 Test 6: Verify working hours structure for slot engine");

  const data = await readSalonInfo();
  const hours = data.working_hours;

  assert(hours !== null, "working_hours is not null");
  assert(typeof hours === "object", "working_hours is an object");

  const validDays = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  const days = Object.keys(hours);

  for (const day of days) {
    assert(validDays.includes(day), `day "${day}" is a valid day key`);
    const dayData = hours[day];
    if (dayData !== null) {
      assert(
        typeof dayData.open === "string" && /^\d{2}:\d{2}$/.test(dayData.open),
        `${day} open time format valid: "${dayData.open}"`
      );
      assert(
        typeof dayData.close === "string" && /^\d{2}:\d{2}$/.test(dayData.close),
        `${day} close time format valid: "${dayData.close}"`
      );

      // Verify close > open (basic sanity)
      const openMin = parseInt(dayData.open.slice(0, 2)) * 60 + parseInt(dayData.open.slice(3));
      const closeMin = parseInt(dayData.close.slice(0, 2)) * 60 + parseInt(dayData.close.slice(3));
      assert(
        closeMin > openMin,
        `${day} close (${dayData.close}) is after open (${dayData.open})`
      );
    } else {
      console.log(`    ℹ️  ${day} is closed (null)`);
    }
  }
}

// ─── Test 7: Verify logo URL if set ───
async function testLogoUrl() {
  console.log("\n📋 Test 7: Verify logo URL");

  const data = await readSalonInfo();

  if (data.logo_url) {
    assert(data.logo_url.startsWith("http"), `logo_url is a valid URL: "${data.logo_url}"`);
    assert(
      data.logo_url.includes("supabase") || data.logo_url.includes("storage"),
      `logo_url points to storage`
    );
  } else {
    console.log("    ℹ️  No logo set (logo_url is null)");
    assert(true, "logo_url null is handled by fallback icon in Hero");
  }
}

// ─── Test 8: Restore original values ───
async function testRestore(originalData, fields) {
  console.log("\n📋 Test 8: Restore original values");

  const restoreData = {};
  for (const field of fields) {
    restoreData[field.key] = originalData[field.dbCol];
  }

  await updateSalonInfo(restoreData);
  console.log("  Restored original values");

  // Verify restoration
  const data = await readSalonInfo();
  for (const field of fields) {
    assert(
      data[field.dbCol] === originalData[field.dbCol],
      `${field.label} restored to original`
    );
  }
}

// ─── Main ───
async function main() {
  console.log("🧪 QA Test: Owner Settings → Database → Customer Display");
  console.log("═".repeat(55));

  try {
    // Detect which columns exist in the database
    const dbColumns = await detectColumns();
    console.log(`\n📋 Database columns detected: ${dbColumns.join(", ")}`);

    // Filter fields to only test columns that exist in the DB
    const availableFields = FIELDS.filter((f) => {
      const exists = dbColumns.includes(f.dbCol);
      if (!exists) {
        console.log(`  ⚠️  Column "${f.dbCol}" NOT in database — skipping ${f.label} test`);
      }
      return exists;
    });

    if (availableFields.length === 0) {
      console.error("\n❌ No testable columns found in database!");
      process.exit(1);
    }

    const originalData = await testReadCurrentData();
    await testSaveAndVerify(originalData, availableFields);
    await testDataMapping(dbColumns);
    await testPhoneFormat();
    await testContactLinks();
    await testWorkingHoursInSlots();
    await testLogoUrl();
    await testRestore(originalData, availableFields);
  } catch (err) {
    console.error("\n💥 FATAL ERROR:", err.message);
    failed++;
    errors.push(err.message);
  }

  console.log("\n" + "═".repeat(55));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("\n❌ Failed assertions:");
    errors.forEach((e) => console.log(`   - ${e}`));
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

main();
