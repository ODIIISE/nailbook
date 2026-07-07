#!/usr/bin/env node

/**
 * QA Test: Services & Addons CRUD
 *
 * Tests every editable field on the owner services/addons page:
 *   1. Reads current services and addons from Supabase
 *   2. Creates test service + addon, verifies persistence
 *   3. Links addon to service, verifies
 *   4. Updates fields, verifies
 *   5. Toggles is_active, verifies
 *   6. Cleans up test data
 *
 * Usage: node scripts/qa-test-services.js
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
const TEST_SERVICE_ID = crypto.randomUUID();
const TEST_ADDON_ID = crypto.randomUUID();

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

// ─── Test 1: Read existing services ───
async function testReadServices() {
  console.log("\n📋 Test 1: Read existing services");

  const { data, error } = await supabase.from("services").select("*").order("sort_order");
  assert(!error, `services query succeeded${error ? ": " + error.message : ""}`);
  assert(data !== null, "services data is not null");
  assert(data.length > 0, `at least 1 service exists (found ${data.length})`);

  // Validate structure of each service
  for (const svc of data) {
    assert(typeof svc.name === "string" && svc.name.length > 0, `service "${svc.id}" has name: "${svc.name}"`);
    assert(typeof svc.duration_minutes === "number" && svc.duration_minutes > 0, `service "${svc.id}" has valid duration: ${svc.duration_minutes}min`);
    assert(typeof svc.price === "number" && svc.price >= 0, `service "${svc.id}" has valid price: ${svc.price}`);
    assert(typeof svc.is_active === "boolean", `service "${svc.id}" has is_active: ${svc.is_active}`);
    assert(Array.isArray(svc.addon_ids), `service "${svc.id}" has addon_ids array`);
    assert(typeof svc.priority_score === "number", `service "${svc.id}" has priority_score: ${svc.priority_score}`);
  }

  return data;
}

// ─── Test 2: Read existing addons ───
async function testReadAddons() {
  console.log("\n📋 Test 2: Read existing addons");

  const { data, error } = await supabase.from("addons").select("*").order("created_at");
  assert(!error, `addons query succeeded${error ? ": " + error.message : ""}`);
  assert(data !== null, "addons data is not null");
  assert(data.length > 0, `at least 1 addon exists (found ${data.length})`);

  for (const addon of data) {
    assert(typeof addon.name === "string" && addon.name.length > 0, `addon "${addon.id}" has name: "${addon.name}"`);
    assert(typeof addon.price === "number" && addon.price >= 0, `addon "${addon.id}" has valid price: ${addon.price}`);
    assert(typeof addon.duration_minutes === "number" && addon.duration_minutes >= 0, `addon "${addon.id}" has valid duration: ${addon.duration_minutes}min`);
    assert(typeof addon.is_active === "boolean", `addon "${addon.id}" has is_active: ${addon.is_active}`);
  }

  return data;
}

// ─── Test 3: Create test service ───
async function testCreateService() {
  console.log("\n📋 Test 3: Create test service");

  const testService = {
    id: TEST_SERVICE_ID,
    name: "تست کیفیت - سرویس آزمایشی",
    description: "توضیحات تستی برای بررسی عملکرد",
    duration_minutes: 30,
    price: 100000,
    is_active: true,
    sort_order: 999,
    addon_ids: [],
    priority_score: 5,
  };

  const { error } = await supabase.from("services").upsert(testService);
  assert(!error, `service created${error ? ": " + error.message : ""}`);

  // Read back
  const { data, error: readError } = await supabase.from("services").select("*").eq("id", TEST_SERVICE_ID).single();
  assert(!readError, `service read back succeeded`);
  assert(data?.name === testService.name, `name matches: "${data?.name}"`);
  assert(data?.description === testService.description, `description matches`);
  assert(data?.duration_minutes === testService.duration_minutes, `duration matches: ${data?.duration_minutes}`);
  assert(data?.price === testService.price, `price matches: ${data?.price}`);
  assert(data?.is_active === true, `is_active is true`);
  assert(data?.priority_score === 5, `priority_score is 5`);

  return testService;
}

// ─── Test 4: Create test addon ───
async function testCreateAddon() {
  console.log("\n📋 Test 4: Create test addon");

  const testAddon = {
    id: TEST_ADDON_ID,
    name: "تست کیفیت - آدون آزمایشی",
    price: 50000,
    duration_minutes: 10,
    is_active: true,
  };

  const { error } = await supabase.from("addons").upsert(testAddon);
  assert(!error, `addon created${error ? ": " + error.message : ""}`);

  // Read back
  const { data, error: readError } = await supabase.from("addons").select("*").eq("id", TEST_ADDON_ID).single();
  assert(!readError, `addon read back succeeded`);
  assert(data?.name === testAddon.name, `name matches: "${data?.name}"`);
  assert(data?.price === testAddon.price, `price matches: ${data?.price}`);
  assert(data?.duration_minutes === testAddon.duration_minutes, `duration matches: ${data?.duration_minutes}`);
  assert(data?.is_active === true, `is_active is true`);

  return testAddon;
}

// ─── Test 5: Link addon to service ───
async function testLinkAddonToService() {
  console.log("\n📋 Test 5: Link addon to service (addon_ids)");

  const { error } = await supabase
    .from("services")
    .update({ addon_ids: [TEST_ADDON_ID] })
    .eq("id", TEST_SERVICE_ID);
  assert(!error, `addon_ids updated${error ? ": " + error.message : ""}`);

  const { data } = await supabase.from("services").select("addon_ids").eq("id", TEST_SERVICE_ID).single();
  assert(data?.addon_ids?.includes(TEST_ADDON_ID), `addon_ids contains test addon`);
  assert(data?.addon_ids?.length === 1, `addon_ids has exactly 1 entry`);
}

// ─── Test 6: Update service fields ───
async function testUpdateService() {
  console.log("\n📋 Test 6: Update service price and duration");

  const { error } = await supabase
    .from("services")
    .update({ price: 200000, duration_minutes: 45, priority_score: 8 })
    .eq("id", TEST_SERVICE_ID);
  assert(!error, `service updated${error ? ": " + error.message : ""}`);

  const { data } = await supabase.from("services").select("*").eq("id", TEST_SERVICE_ID).single();
  assert(data?.price === 200000, `price updated to 200000`);
  assert(data?.duration_minutes === 45, `duration updated to 45`);
  assert(data?.priority_score === 8, `priority_score updated to 8`);
}

// ─── Test 7: Toggle is_active ───
async function testToggleActive() {
  console.log("\n📋 Test 7: Toggle service is_active");

  // Deactivate
  await supabase.from("services").update({ is_active: false }).eq("id", TEST_SERVICE_ID);
  let { data } = await supabase.from("services").select("is_active").eq("id", TEST_SERVICE_ID).single();
  assert(data?.is_active === false, `service deactivated`);

  // Reactivate
  await supabase.from("services").update({ is_active: true }).eq("id", TEST_SERVICE_ID);
  ({ data } = await supabase.from("services").select("is_active").eq("id", TEST_SERVICE_ID).single());
  assert(data?.is_active === true, `service reactivated`);
}

// ─── Test 8: Update addon fields ───
async function testUpdateAddon() {
  console.log("\n📋 Test 8: Update addon price and duration");

  const { error } = await supabase
    .from("addons")
    .update({ price: 75000, duration_minutes: 15 })
    .eq("id", TEST_ADDON_ID);
  assert(!error, `addon updated${error ? ": " + error.message : ""}`);

  const { data } = await supabase.from("addons").select("*").eq("id", TEST_ADDON_ID).single();
  assert(data?.price === 75000, `addon price updated to 75000`);
  assert(data?.duration_minutes === 15, `addon duration updated to 15`);
}

// ─── Test 9: Verify service-addon relationship round-trips ───
async function testServiceAddonRoundTrip() {
  console.log("\n📋 Test 9: Verify service-addon relationship in customer flow simulation");

  // Read the service with its addon_ids
  const { data: service } = await supabase.from("services").select("*").eq("id", TEST_SERVICE_ID).single();
  assert(service, "test service exists");

  // Read all addons
  const { data: allAddons } = await supabase.from("addons").select("*");

  // Simulate what content.tsx does: filter addons by service.addon_ids + is_active
  const linkedAddons = allAddons.filter(
    (a) => service.addon_ids.includes(a.id) && a.is_active
  );
  assert(linkedAddons.length === 1, `1 active addon linked to service`);
  assert(linkedAddons[0].id === TEST_ADDON_ID, `linked addon is the test addon`);

  // Simulate totalDuration and totalPrice calculation
  const totalDuration = service.duration_minutes + linkedAddons.reduce((s, a) => s + a.duration_minutes, 0);
  const totalPrice = service.price + linkedAddons.reduce((s, a) => s + a.price, 0);
  assert(totalDuration === 60, `total duration = 45 + 15 = 60min`);
  assert(totalPrice === 275000, `total price = 200000 + 75000 = 275000`);
}

// ─── Test 10: Clean up test data ───
async function testCleanup() {
  console.log("\n📋 Test 10: Clean up test data");

  // Remove addon link from service first
  await supabase.from("services").update({ addon_ids: [] }).eq("id", TEST_SERVICE_ID);

  // Delete test service
  const { error: svcErr } = await supabase.from("services").delete().eq("id", TEST_SERVICE_ID);
  assert(!svcErr, `test service deleted`);

  // Delete test addon
  const { error: addonErr } = await supabase.from("addons").delete().eq("id", TEST_ADDON_ID);
  assert(!addonErr, `test addon deleted`);

  // Verify gone
  const { data: svcCheck } = await supabase.from("services").select("id").eq("id", TEST_SERVICE_ID);
  assert(svcCheck?.length === 0, `test service no longer in DB`);

  const { data: addonCheck } = await supabase.from("addons").select("id").eq("id", TEST_ADDON_ID);
  assert(addonCheck?.length === 0, `test addon no longer in DB`);
}

// ─── Test 11: Verify DB schema columns exist ───
async function testSchemaColumns() {
  console.log("\n📋 Test 11: Verify database schema columns");

  // Read one service to see what columns exist
  const { data: svc } = await supabase.from("services").select("*").limit(1).single();
  const svcCols = Object.keys(svc || {});
  const expectedSvcCols = ["id", "name", "description", "duration_minutes", "price", "is_active", "sort_order", "addon_ids", "priority_score"];
  for (const col of expectedSvcCols) {
    assert(svcCols.includes(col), `services table has column: ${col}`);
  }

  // Read one addon
  const { data: addon } = await supabase.from("addons").select("*").limit(1).single();
  const addonCols = Object.keys(addon || {});
  const expectedAddonCols = ["id", "name", "price", "duration_minutes", "is_active"];
  for (const col of expectedAddonCols) {
    assert(addonCols.includes(col), `addons table has column: ${col}`);
  }
}

// ─── Main ───
async function main() {
  console.log("🧪 QA Test: Services & Addons CRUD");
  console.log("═".repeat(55));

  try {
    await testReadServices();
    await testReadAddons();
    await testCreateService();
    await testCreateAddon();
    await testLinkAddonToService();
    await testUpdateService();
    await testToggleActive();
    await testUpdateAddon();
    await testServiceAddonRoundTrip();
    await testSchemaColumns();
    await testCleanup();
  } catch (err) {
    console.error("\n💥 FATAL ERROR:", err.message);
    failed++;
    errors.push(err.message);
    // Attempt cleanup even on error
    try {
      await supabase.from("services").delete().eq("id", TEST_SERVICE_ID);
      await supabase.from("addons").delete().eq("id", TEST_ADDON_ID);
      console.log("  🧹 Cleanup completed after error");
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
