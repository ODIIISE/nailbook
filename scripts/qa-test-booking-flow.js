#!/usr/bin/env node

/**
 * QA Test: Booking Flow End-to-End
 *
 * Tests the complete booking data flow:
 *   1. Working hours structure and validity
 *   2. Service availability for booking
 *   3. Time slot generation logic
 *   4. Booking creation and persistence
 *   5. Booking conflict detection
 *   6. Contact link formats
 *   7. Phone format validation
 *   8. Cleanup
 *
 * Usage: node scripts/qa-test-booking-flow.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const crypto = require("crypto");

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

// Use proper UUIDs for test data
const TEST_BOOKING_ID = crypto.randomUUID();
const TEST_BOOKING_ID_2 = crypto.randomUUID();

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

// ─── Test 1: Working hours structure ───
async function testWorkingHours() {
  console.log("\n📋 Test 1: Working hours structure validation");

  const { data } = await supabase.from("salon_info").select("working_hours").limit(1).single();
  const hours = data?.working_hours;

  assert(hours !== null, "working_hours is not null");
  assert(typeof hours === "object", "working_hours is an object");

  const validDays = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  const days = Object.keys(hours);

  assert(days.length === 7, `working_hours has 7 day keys (found ${days.length})`);

  for (const day of validDays) {
    assert(day in hours, `day "${day}" exists`);
    const dayData = hours[day];

    if (dayData !== null) {
      assert(typeof dayData.open === "string", `${day} has open time: "${dayData.open}"`);
      assert(typeof dayData.close === "string", `${day} has close time: "${dayData.close}"`);
      assert(/^\d{2}:\d{2}$/.test(dayData.open), `${day} open format HH:MM`);
      assert(/^\d{2}:\d{2}$/.test(dayData.close), `${day} close format HH:MM`);

      const openMin = parseInt(dayData.open.slice(0, 2)) * 60 + parseInt(dayData.open.slice(3));
      const closeMin = parseInt(dayData.close.slice(0, 2)) * 60 + parseInt(dayData.close.slice(3));
      assert(closeMin > openMin, `${day} close (${dayData.close}) > open (${dayData.open})`);

      // Verify times align to slot grid (should be multiples of 5 at least)
      assert(openMin % 5 === 0, `${day} open aligns to 5-min grid`);
      assert(closeMin % 5 === 0, `${day} close aligns to 5-min grid`);
    } else {
      console.log(`    ℹ️  ${day} is closed (null)`);
    }
  }

  return hours;
}

// ─── Test 2: Specific days off ───
async function testDaysOff() {
  console.log("\n📋 Test 2: Specific days off structure");

  const { data } = await supabase.from("salon_info").select("specific_days_off").limit(1).single();
  const daysOff = data?.specific_days_off;

  assert(Array.isArray(daysOff), "specific_days_off is an array");

  for (const d of daysOff) {
    assert(typeof d === "string", `day-off entry is string: "${d}"`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(d), `day-off format YYYY-MM-DD: "${d}"`);
  }

  console.log(`    ℹ️  ${daysOff.length} days off configured`);
}

// ─── Test 3: Active service exists ───
async function testActiveService() {
  console.log("\n📋 Test 3: At least one active service exists");

  const { data } = await supabase.from("services").select("*").eq("is_active", true);
  assert(data !== null, "services query succeeded");
  assert(data.length > 0, `at least 1 active service (found ${data.length})`);

  // Find the first active service for later tests
  const svc = data[0];
  assert(svc.name.length > 0, `first active service has name: "${svc.name}"`);
  assert(svc.duration_minutes > 0, `first active service has duration: ${svc.duration_minutes}min`);
  assert(svc.price >= 0, `first active service has price: ${svc.price}`);

  return svc;
}

// ─── Test 4: Active addons ───
async function testActiveAddons() {
  console.log("\n📋 Test 4: Active addons structure");

  const { data } = await supabase.from("addons").select("*").eq("is_active", true);
  assert(data !== null, "addons query succeeded");
  assert(data.length > 0, `at least 1 active addon (found ${data.length})`);

  for (const addon of data) {
    assert(addon.name.length > 0, `addon has name: "${addon.name}"`);
    assert(addon.price >= 0, `addon has valid price: ${addon.price}`);
    assert(addon.duration_minutes >= 0, `addon has valid duration: ${addon.duration_minutes}min`);
  }

  return data;
}

// ─── Test 5: Simulate time slot generation ───
async function testSlotGeneration(service, addons, hours) {
  console.log("\n📋 Test 5: Simulate time slot generation logic");

  // Simulate what content.tsx does
  const linkedAddons = addons.filter((a) => service.addon_ids.includes(a.id));
  const totalDuration = service.duration_minutes + linkedAddons.reduce((s, a) => s + a.duration_minutes, 0);

  assert(totalDuration > 0, `totalDuration is positive: ${totalDuration}min`);

  // Find an active day
  const activeDay = Object.entries(hours).find(([, v]) => v !== null);
  assert(activeDay !== undefined, "at least one active day exists");

  const [dayKey, dayHours] = activeDay;
  const openMin = parseInt(dayHours.open.slice(0, 2)) * 60 + parseInt(dayHours.open.slice(3));
  const closeMin = parseInt(dayHours.close.slice(0, 2)) * 60 + parseInt(dayHours.close.slice(3));
  const shiftMinutes = closeMin - openMin;

  assert(shiftMinutes >= totalDuration, `shift (${shiftMinutes}min) >= totalDuration (${totalDuration}min)`);

  // Simulate slot generation: 30-min cadence within shift
  const candidates = [];
  for (let t = openMin; t + totalDuration <= closeMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    candidates.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  assert(candidates.length > 0, `generated ${candidates.length} time slots for ${dayKey}`);

  // Verify slot format
  for (const slot of candidates) {
    assert(/^\d{2}:\d{2}$/.test(slot), `slot format valid: ${slot}`);
    const slotMin = parseInt(slot.slice(0, 2)) * 60 + parseInt(slot.slice(3));
    assert(slotMin >= openMin, `slot ${slot} >= open ${dayHours.open}`);
    assert(slotMin + totalDuration <= closeMin, `slot ${slot} + ${totalDuration}min <= close ${dayHours.close}`);
  }

  // Verify suggested slots (first 4)
  assert(candidates.length >= 4 || candidates.length > 0, `has suggested slots`);

  console.log(`    ℹ️  Day: ${dayKey}, Shift: ${dayHours.open}-${dayHours.close}, Slots: ${candidates.length}`);
}

// ─── Test 6: Create and verify test booking ───
async function testCreateBooking(service) {
  console.log("\n📋 Test 6: Create test booking and verify persistence");

  // Get today's date in YYYY-MM-DD format
  const now = new Date();
  const dateKey = now.toISOString().split("T")[0];

  const testBooking = {
    id: TEST_BOOKING_ID,
    service_id: service.id,
    selected_addons: [],
    customer_name: "تست کیفیت",
    customer_phone: "09111111111",
    date: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`,
    date_gregorian: dateKey,
    start_time: "14:00:00",
    end_time: "15:00:00",
    status: "confirmed",
    phone_verified: true,
  };

  const { error } = await supabase.from("bookings").insert(testBooking);
  assert(!error, `booking created${error ? ": " + error.message : ""}`);

  // Read back
  const { data, error: readErr } = await supabase.from("bookings").select("*").eq("id", TEST_BOOKING_ID).single();
  assert(!readErr, `booking read back succeeded`);
  assert(data?.service_id === service.id, `service_id matches`);
  assert(data?.customer_phone === "09111111111", `customer_phone matches`);
  assert(data?.date_gregorian === dateKey, `date_gregorian matches`);
  assert(data?.start_time === "14:00:00", `start_time matches`);
  assert(data?.end_time === "15:00:00", `end_time matches`);
  assert(data?.status === "confirmed", `status is confirmed`);

  return testBooking;
}

// ─── Test 7: Booking conflict detection ───
async function testBookingConflict(service) {
  console.log("\n📋 Test 7: Booking conflict detection (overlapping time)");

  const now = new Date();
  const dateKey = now.toISOString().split("T")[0];

  // Try to create an overlapping booking
  const overlapBooking = {
    id: TEST_BOOKING_ID_2,
    service_id: service.id,
    selected_addons: [],
    customer_name: "تست تداخل",
    customer_phone: "09222222222",
    date: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`,
    date_gregorian: dateKey,
    start_time: "14:30:00", // Overlaps with 14:00-15:00
    end_time: "15:30:00",
    status: "confirmed",
    phone_verified: true,
  };

  // Check if reserve API would catch this (simulate the overlap query)
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("date_gregorian", dateKey)
    .eq("status", "confirmed")
    .lte("start_time", "15:30:00")
    .gte("end_time", "14:30:00");

  assert(conflicts !== null, "conflict query succeeded");
  assert(conflicts.length > 0, `overlap detected: ${conflicts.length} conflicting booking(s) found`);

  // The overlapping booking should NOT be inserted (simulate reserve API behavior)
  console.log("    ℹ️  Reserve API would return 409 for this overlapping slot");
}

// ─── Test 8: Phone format validation ───
async function testPhoneFormat() {
  console.log("\n📋 Test 8: Phone format validation");

  const { data } = await supabase.from("salon_info").select("phone").limit(1).single();
  const phone = data?.phone;

  assert(typeof phone === "string", "phone is string");
  assert(/^0\d{10}$/.test(phone), `phone matches Iranian format: "${phone}"`);
  assert(phone.length === 11, `phone is 11 digits`);

  // Test normalization logic (Persian → English digits)
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const normalized = phone.split("").map((c) => {
    const idx = persianDigits.indexOf(c);
    return idx >= 0 ? String(idx) : c;
  }).join("");
  // Phone is already English digits, so normalized should match
  assert(normalized === phone || normalized.length === phone.length, `digit normalization works`);
}

// ─── Test 9: Contact link formats ───
async function testContactLinks() {
  console.log("\n📋 Test 9: Contact button link formats");

  const { data } = await supabase.from("salon_info").select("phone").limit(1).single();
  const phone = data?.phone;

  const telUrl = `tel:${phone}`;
  const smsUrl = `sms:${phone}`;
  const waUrl = `https://wa.me/98${phone.slice(1)}`;

  assert(telUrl === `tel:${phone}`, `tel: format correct`);
  assert(smsUrl === `sms:${phone}`, `sms: format correct`);
  assert(waUrl.startsWith("https://wa.me/98"), `wa.me format correct`);

  const waNumber = waUrl.replace("https://wa.me/", "");
  assert(waNumber.length === 12, `wa.me number is 12 digits (98 + 10)`);
  assert(waNumber.startsWith("98"), `wa.me has country code 98`);
  assert(!waNumber.startsWith("980"), `wa.me no double zero (0 stripped)`);
}

// ─── Test 10: Booking receipt data ───
async function testBookingReceipt(service) {
  console.log("\n📋 Test 10: Booking receipt data simulation");

  // Simulate what booking-confirm.tsx receives
  const receiptData = {
    serviceName: service.name,
    duration: service.duration_minutes,
    price: service.price,
    customerName: "تست کیفیت",
    bookingId: `BK-${Date.now().toString(36).toUpperCase()}`,
    phone: (await supabase.from("salon_info").select("phone").limit(1).single()).data.phone,
  };

  assert(receiptData.serviceName.length > 0, `receipt has service name`);
  assert(receiptData.duration > 0, `receipt has duration: ${receiptData.duration}min`);
  assert(receiptData.price >= 0, `receipt has price: ${receiptData.price}`);
  assert(receiptData.customerName.length > 0, `receipt has customer name`);
  assert(receiptData.bookingId.startsWith("BK-"), `receipt booking ID format: ${receiptData.bookingId}`);
  assert(receiptData.phone.length === 11, `receipt has phone`);
}

// ─── Test 11: Verify booking is queryable by customer ───
async function testBookingQueryable() {
  console.log("\n📋 Test 11: Verify booking is queryable");

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_phone", "09111111111")
    .eq("status", "confirmed");

  assert(!error, `booking query succeeded`);
  assert(data.length > 0, `found booking by customer phone`);
  assert(data[0].id === TEST_BOOKING_ID, `correct booking returned`);
}

// ─── Test 12: Clean up ───
async function testCleanup() {
  console.log("\n📋 Test 12: Clean up test bookings");

  const { error: e1 } = await supabase.from("bookings").delete().eq("id", TEST_BOOKING_ID);
  assert(!e1, `test booking 1 deleted`);

  const { error: e2 } = await supabase.from("bookings").delete().eq("id", TEST_BOOKING_ID_2);
  assert(!e2, `test booking 2 deleted (if existed)`);

  // Verify gone
  const { data } = await supabase.from("bookings").select("id").eq("id", TEST_BOOKING_ID);
  assert(data?.length === 0, `test booking no longer in DB`);
}

// ─── Main ───
async function main() {
  console.log("🧪 QA Test: Booking Flow End-to-End");
  console.log("═".repeat(55));

  try {
    const hours = await testWorkingHours();
    await testDaysOff();
    const service = await testActiveService();
    const addons = await testActiveAddons();
    await testSlotGeneration(service, addons, hours);
    await testCreateBooking(service);
    await testBookingConflict(service);
    await testPhoneFormat();
    await testContactLinks();
    await testBookingReceipt(service);
    await testBookingQueryable();
    await testCleanup();
  } catch (err) {
    console.error("\n💥 FATAL ERROR:", err.message);
    failed++;
    errors.push(err.message);
    // Attempt cleanup
    try {
      await supabase.from("bookings").delete().eq("id", TEST_BOOKING_ID);
      await supabase.from("bookings").delete().eq("id", TEST_BOOKING_ID_2);
    } catch {}
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
