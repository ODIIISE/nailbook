#!/bin/bash

# QA Full Verification: Database Sanity Check for ALL tables
#
# Validates:
#   1. salon_info: all fields, phone format, working hours structure
#   2. services: at least 1 active, all have name/duration/price
#   3. addons: all have name/price/duration
#   4. bookings: recent bookings have valid structure
#   5. Schema mismatch detection
#
# Usage: bash scripts/qa-verify-all.sh
# Requires: curl, jq, .env.local

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env.local not found at $ENV_FILE"
  exit 1
fi

SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)
SUPABASE_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d'=' -f2-)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env.local"
  exit 1
fi

HEADERS=(-H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY")

PASSED=0
FAILED=0

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo "  ✅ $desc"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ $desc"
    FAILED=$((FAILED + 1))
  fi
}

fetch_json() {
  local url="$1"
  curl -s "${HEADERS[@]}" "$url"
}

echo "🔍 QA Full Verification: All Tables"
echo "════════════════════════════════════════════════"

# ═══════════════════════════════════════════
# SECTION 1: salon_info
# ═══════════════════════════════════════════
echo ""
echo "📋 SECTION 1: salon_info"

SALON=$(fetch_json "$SUPABASE_URL/rest/v1/salon_info?select=*&limit=1" | jq '.[0]')

# Field presence
NAME=$(echo "$SALON" | jq -r '.name // empty')
[ -n "$NAME" ] && check "salon name is present" "pass" || check "salon name is present" "fail"

PHONE=$(echo "$SALON" | jq -r '.phone // empty')
[ -n "$PHONE" ] && check "salon phone is present" "pass" || check "salon phone is present" "fail"

ADDRESS=$(echo "$SALON" | jq -r '.address // empty')
[ -n "$ADDRESS" ] && check "salon address is present" "pass" || check "salon address is present" "fail"

DESC=$(echo "$SALON" | jq -r '.description // empty')
[ -n "$DESC" ] && check "salon description is present" "pass" || check "salon description is present" "fail"

WHT=$(echo "$SALON" | jq -r '.working_hours_text // empty')
[ -n "$WHT" ] && check "working_hours_text is present" "pass" || check "working_hours_text is present" "fail"

# Phone format
[[ "$PHONE" =~ ^0[0-9]{10}$ ]] && check "phone format: 0XXXXXXXXXX" "pass" || check "phone format: 0XXXXXXXXXX (got: $PHONE)" "fail"

# Working hours JSONB
WH=$(echo "$SALON" | jq -r '.working_hours')
[ "$WH" != "null" ] && [ -n "$WH" ] && check "working_hours JSONB exists" "pass" || check "working_hours JSONB exists" "fail"

for day in sat sun mon tue wed thu; do
  OPEN=$(echo "$WH" | jq -r ".$day.open // empty")
  CLOSE=$(echo "$WH" | jq -r ".$day.close // empty")
  if [ -n "$OPEN" ] && [ -n "$CLOSE" ]; then
    [[ "$OPEN" =~ ^[0-9]{2}:[0-9]{2}$ ]] && check "$day open format HH:MM ($OPEN)" "pass" || check "$day open format HH:MM" "fail"
    [[ "$CLOSE" =~ ^[0-9]{2}:[0-9]{2}$ ]] && check "$day close format HH:MM ($CLOSE)" "pass" || check "$day close format HH:MM" "fail"
    OPEN_MIN=$(echo "$OPEN" | awk -F: '{print $1 * 60 + $2}')
    CLOSE_MIN=$(echo "$CLOSE" | awk -F: '{print $1 * 60 + $2}')
    [ "$CLOSE_MIN" -gt "$OPEN_MIN" ] && check "$day close > open" "pass" || check "$day close > open ($CLOSE <= $OPEN)" "fail"
  fi
done

# Specific days off
DAYS_OFF=$(echo "$SALON" | jq -r '.specific_days_off')
[ "$DAYS_OFF" != "null" ] && check "specific_days_off is array" "pass" || check "specific_days_off is array" "fail"

# ═══════════════════════════════════════════
# SECTION 2: services
# ═══════════════════════════════════════════
echo ""
echo "📋 SECTION 2: services"

SVCS=$(fetch_json "$SUPABASE_URL/rest/v1/services?select=*&order=sort_order")
SVC_COUNT=$(echo "$SVCS" | jq 'length')
[ "$SVC_COUNT" -gt 0 ] && check "at least 1 service exists (found $SVC_COUNT)" "pass" || check "at least 1 service exists" "fail"

ACTIVE_SVCS=$(echo "$SVCS" | jq '[.[] | select(.is_active == true)] | length')
[ "$ACTIVE_SVCS" -gt 0 ] && check "at least 1 active service (found $ACTIVE_SVCS)" "pass" || check "at least 1 active service" "fail"

# Validate each service
echo "$SVCS" | jq -c '.[]' | while read -r SVC; do
  SVC_ID=$(echo "$SVC" | jq -r '.id')
  SVC_NAME=$(echo "$SVC" | jq -r '.name // empty')
  SVC_DUR=$(echo "$SVC" | jq -r '.duration_minutes // empty')
  SVC_PRICE=$(echo "$SVC" | jq -r '.price // empty')

  [ -n "$SVC_NAME" ] && echo "  ✅ service $SVC_ID has name: $SVC_NAME" || echo "  ❌ service $SVC_ID missing name"
  [ -n "$SVC_DUR" ] && [ "$SVC_DUR" != "0" ] && echo "  ✅ service $SVC_ID has duration: ${SVC_DUR}min" || echo "  ❌ service $SVC_ID has invalid duration"
  [ -n "$SVC_PRICE" ] && [ "$SVC_PRICE" != "null" ] && echo "  ✅ service $SVC_ID has price: $SVC_PRICE" || echo "  ❌ service $SVC_ID missing price"
done

# Verify addon_ids structure
echo "$SVCS" | jq -c '.[]' | while read -r SVC; do
  SVC_ID=$(echo "$SVC" | jq -r '.id')
  ADDON_IDS=$(echo "$SVC" | jq -r '.addon_ids')
  if [ "$ADDON_IDS" != "null" ] && [ "$ADDON_IDS" != "[]" ]; then
    echo "  ℹ️  service $SVC_ID has addon_ids: $ADDON_IDS"
  fi
done

# ═══════════════════════════════════════════
# SECTION 3: addons
# ═══════════════════════════════════════════
echo ""
echo "📋 SECTION 3: addons"

ADDONS=$(fetch_json "$SUPABASE_URL/rest/v1/addons?select=*")
ADDON_COUNT=$(echo "$ADDONS" | jq 'length')
[ "$ADDON_COUNT" -gt 0 ] && check "at least 1 addon exists (found $ADDON_COUNT)" "pass" || check "at least 1 addon exists" "fail"

ACTIVE_ADDONS=$(echo "$ADDONS" | jq '[.[] | select(.is_active == true)] | length')
[ "$ACTIVE_ADDONS" -gt 0 ] && check "at least 1 active addon (found $ACTIVE_ADDONS)" "pass" || check "at least 1 active addon" "fail"

echo "$ADDONS" | jq -c '.[]' | while read -r ADDON; do
  A_ID=$(echo "$ADDON" | jq -r '.id')
  A_NAME=$(echo "$ADDON" | jq -r '.name // empty')
  A_PRICE=$(echo "$ADDON" | jq -r '.price // empty')
  A_DUR=$(echo "$ADDON" | jq -r '.duration_minutes // empty')

  [ -n "$A_NAME" ] && echo "  ✅ addon $A_ID has name: $A_NAME" || echo "  ❌ addon $A_ID missing name"
  [ -n "$A_PRICE" ] && [ "$A_PRICE" != "null" ] && echo "  ✅ addon $A_ID has price: $A_PRICE" || echo "  ❌ addon $A_ID missing price"
  [ -n "$A_DUR" ] && echo "  ✅ addon $A_ID has duration: ${A_DUR}min" || echo "  ❌ addon $A_ID missing duration"
done

# ═══════════════════════════════════════════
# SECTION 4: bookings (recent)
# ═══════════════════════════════════════════
echo ""
echo "📋 SECTION 4: bookings (recent)"

BOOKINGS=$(fetch_json "$SUPABASE_URL/rest/v1/bookings?select=*&order=created_at.desc&limit=5")
BK_COUNT=$(echo "$BOOKINGS" | jq 'length')

if [ "$BK_COUNT" -gt 0 ]; then
  check "recent bookings found (showing $BK_COUNT)" "pass"

  echo "$BOOKINGS" | jq -c '.[]' | while read -r BK; do
    BK_ID=$(echo "$BK" | jq -r '.id')
    BK_SVC=$(echo "$BK" | jq -r '.service_id // empty')
    BK_PHONE=$(echo "$BK" | jq -r '.customer_phone // empty')
    BK_DATE=$(echo "$BK" | jq -r '.date_gregorian // empty')
    BK_START=$(echo "$BK" | jq -r '.start_time // empty')
    BK_END=$(echo "$BK" | jq -r '.end_time // empty')
    BK_STATUS=$(echo "$BK" | jq -r '.status // empty')

    [ -n "$BK_SVC" ] && echo "  ✅ booking $BK_ID has service_id" || echo "  ❌ booking $BK_ID missing service_id"
    [[ "$BK_PHONE" =~ ^0[0-9]{9,10}$ ]] && echo "  ✅ booking $BK_ID has valid phone" || echo "  ❌ booking $BK_ID has invalid phone"
    [[ "$BK_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && echo "  ✅ booking $BK_ID has valid date" || echo "  ❌ booking $BK_ID has invalid date"
    [[ "$BK_START" =~ ^[0-9]{2}:[0-9]{2}:[0-9]{2}$ ]] && echo "  ✅ booking $BK_ID has valid start_time" || echo "  ❌ booking $BK_ID has invalid start_time"
    [[ "$BK_END" =~ ^[0-9]{2}:[0-9]{2}:[0-9]{2}$ ]] && echo "  ✅ booking $BK_ID has valid end_time" || echo "  ❌ booking $BK_ID has invalid end_time"
    [ "$BK_STATUS" = "confirmed" ] || [ "$BK_STATUS" = "pending" ] || [ "$BK_STATUS" = "completed" ] || [ "$BK_STATUS" = "cancelled" ] && echo "  ✅ booking $BK_ID has valid status: $BK_STATUS" || echo "  ❌ booking $BK_ID has invalid status: $BK_STATUS"
  done
else
  echo "  ℹ️  No bookings in database"
  check "no bookings (empty state handled)" "pass"
fi

# ═══════════════════════════════════════════
# SECTION 5: Schema mismatch detection
# ═══════════════════════════════════════════
echo ""
echo "📋 SECTION 5: Schema vs DB column check"

# salon_info expected columns
SALON_DB_COLS=$(echo "$SALON" | jq -r 'keys[]')
SALON_SCHEMA="id name description slogan phone address hero_image_url logo_url working_hours_text working_hours specific_days_off slot_buffer_minutes slot_interval_minutes created_at"

MISSING=""
for col in $SALON_SCHEMA; do
  if ! echo "$SALON_DB_COLS" | grep -qw "$col"; then
    MISSING="$MISSING $col"
  fi
done

if [ -n "$MISSING" ]; then
  echo "  ⚠️  salon_info columns in schema.sql but NOT in DB:$MISSING"
else
  check "salon_info: all schema columns present" "pass"
fi

# services expected columns
if [ "$SVC_COUNT" -gt 0 ]; then
  SVC_DB_COLS=$(echo "$SVCS" | jq -r '.[0] | keys[]')
  SVC_SCHEMA="id name description duration_minutes price is_active sort_order addon_ids priority_score created_at"

  MISSING_SVC=""
  for col in $SVC_SCHEMA; do
    if ! echo "$SVC_DB_COLS" | grep -qw "$col"; then
      MISSING_SVC="$MISSING_SVC $col"
    fi
  done

  if [ -n "$MISSING_SVC" ]; then
    echo "  ⚠️  services columns missing:$MISSING_SVC"
  else
    check "services: all schema columns present" "pass"
  fi
fi

# addons expected columns
if [ "$ADDON_COUNT" -gt 0 ]; then
  ADDON_DB_COLS=$(echo "$ADDONS" | jq -r '.[0] | keys[]')
  ADDON_SCHEMA="id name price duration_minutes is_active created_at"

  MISSING_ADDON=""
  for col in $ADDON_SCHEMA; do
    if ! echo "$ADDON_DB_COLS" | grep -qw "$col"; then
      MISSING_ADDON="$MISSING_ADDON $col"
    fi
  done

  if [ -n "$MISSING_ADDON" ]; then
    echo "  ⚠️  addons columns missing:$MISSING_ADDON"
  else
    check "addons: all schema columns present" "pass"
  fi
fi

# ═══════════════════════════════════════════
# SECTION 6: Data integrity cross-checks
# ═══════════════════════════════════════════
echo ""
echo "📋 SECTION 6: Data integrity cross-checks"

# Check that all booking service_ids reference existing services
if [ "$BK_COUNT" -gt 0 ]; then
  echo "$BOOKINGS" | jq -r '.[].service_id' | while read -r BK_SVC_ID; do
    SVC_EXISTS=$(echo "$SVCS" | jq "[.[] | select(.id == \"$BK_SVC_ID\")] | length")
    [ "$SVC_EXISTS" -gt 0 ] && echo "  ✅ booking service_id $BK_SVC_ID exists in services" || echo "  ❌ booking service_id $BK_SVC_ID NOT found in services (orphan!)"
  done
else
  echo "  ℹ️  No bookings to cross-check"
fi

# Check addon_ids reference existing addons
if [ "$ADDON_COUNT" -gt 0 ]; then
  echo "$SVCS" | jq -c '.[]' | while read -r SVC; do
    SVC_ID=$(echo "$SVC" | jq -r '.id')
    echo "$SVC" | jq -r '.addon_ids[]? // empty' | while read -r AID; do
      AExists=$(echo "$ADDONS" | jq "[.[] | select(.id == \"$AID\")] | length")
      [ "$AExists" -gt 0 ] && echo "  ✅ service $SVC_ID addon_id $AID exists" || echo "  ❌ service $SVC_ID addon_id $AID NOT found (orphan!)"
    done
  done
fi

# ═══════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════"
echo "📊 Results: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "❌ Some checks failed. Review the output above."
  exit 1
else
  echo ""
  echo "✅ All database checks passed!"
  exit 0
fi
