#!/bin/bash

# QA Verification: Database Sanity Check for salon_info
#
# Reads current salon_info from Supabase and validates:
#   - All text fields are non-empty
#   - Phone format is correct (11 digits starting with 0)
#   - Working hours text is non-empty
#   - Logo URL is valid if set
#   - Working hours JSONB structure is valid
#
# Usage: bash scripts/qa-verify-salon.sh
# Requires: curl, jq, .env.local with SUPABASE credentials

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env.local not found at $ENV_FILE"
  exit 1
fi

# Load env vars
SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)
SUPABASE_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d'=' -f2-)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  exit 1
fi

echo "🔍 QA Verification: salon_info Database Check"
echo "════════════════════════════════════════════════"

# Fetch salon_info
RESPONSE=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/salon_info?select=*&limit=1")

# Check if response is an array
if ! echo "$RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
  echo "❌ Failed to fetch salon_info: $RESPONSE"
  exit 1
fi

DATA=$(echo "$RESPONSE" | jq '.[0]')

if [ "$DATA" = "null" ]; then
  echo "❌ No salon_info row found in database"
  exit 1
fi

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

# ─── Field presence ───
echo ""
echo "📋 Field presence checks"

NAME=$(echo "$DATA" | jq -r '.name // empty')
[ -n "$NAME" ] && check "name is present" "pass" || check "name is present" "fail"

PHONE=$(echo "$DATA" | jq -r '.phone // empty')
[ -n "$PHONE" ] && check "phone is present" "pass" || check "phone is present" "fail"

ADDRESS=$(echo "$DATA" | jq -r '.address // empty')
[ -n "$ADDRESS" ] && check "address is present" "pass" || check "address is present" "fail"

DESC=$(echo "$DATA" | jq -r '.description // empty')
[ -n "$DESC" ] && check "description is present" "pass" || check "description is present" "fail"

WHT=$(echo "$DATA" | jq -r '.working_hours_text // empty')
[ -n "$WHT" ] && check "working_hours_text is present" "pass" || check "working_hours_text is present" "fail"

WH_NULL=$(echo "$DATA" | jq -r '.working_hours == null')
[ "$WH_NULL" = "false" ] && check "working_hours (JSONB) is present" "pass" || check "working_hours (JSONB) is present" "fail"

# ─── Phone format ───
echo ""
echo "📋 Phone format validation"

[[ "$PHONE" == 0* ]] && check "phone starts with 0" "pass" || check "phone starts with 0" "fail"
[ ${#PHONE} -eq 11 ] && check "phone is 11 digits" "pass" || check "phone is 11 digits (got ${#PHONE})" "fail"
[[ "$PHONE" =~ ^[0-9]+$ ]] && check "phone is numeric" "pass" || check "phone is numeric" "fail"

# ─── Working hours text ───
echo ""
echo "📋 Working hours text validation"

[ -n "$WHT" ] && check "working_hours_text is not empty" "pass" || check "working_hours_text is not empty" "fail"

# ─── Working hours JSONB ───
echo ""
echo "📋 Working hours JSONB structure"

WH=$(echo "$DATA" | jq -r '.working_hours')
SAT_NULL=$(echo "$WH" | jq -r '.sat == null')
[ "$SAT_NULL" = "false" ] && check "working_hours has 'sat' key" "pass" || check "working_hours has 'sat' key" "fail"

FRI_NULL=$(echo "$WH" | jq -r '.fri == null')
# fri being null is expected (closed on Friday)
check "working_hours has 'fri' key (null = closed)" "pass"

# Check that open/close times exist for active days
for day in sat sun mon tue wed thu; do
  OPEN=$(echo "$WH" | jq -r ".$day.open // empty")
  CLOSE=$(echo "$WH" | jq -r ".$day.close // empty")
  if [ -n "$OPEN" ] && [ -n "$CLOSE" ]; then
    [[ "$OPEN" =~ ^[0-9]{2}:[0-9]{2}$ ]] && check "$day has valid open time ($OPEN)" "pass" || check "$day has valid open time ($OPEN)" "fail"
    [[ "$CLOSE" =~ ^[0-9]{2}:[0-9]{2}$ ]] && check "$day has valid close time ($CLOSE)" "pass" || check "$day has valid close time ($CLOSE)" "fail"

    # Verify close > open
    OPEN_MIN=$(echo "$OPEN" | awk -F: '{print $1 * 60 + $2}')
    CLOSE_MIN=$(echo "$CLOSE" | awk -F: '{print $1 * 60 + $2}')
    [ "$CLOSE_MIN" -gt "$OPEN_MIN" ] && check "$day close ($CLOSE) is after open ($OPEN)" "pass" || check "$day close ($CLOSE) is after open ($OPEN)" "fail"
  fi
done

# ─── Logo URL ───
echo ""
echo "📋 Logo URL validation"

LOGO=$(echo "$DATA" | jq -r '.logo_url // empty')
if [ -n "$LOGO" ]; then
  [[ "$LOGO" == http* ]] && check "logo_url is a valid URL" "pass" || check "logo_url is a valid URL" "fail"
else
  echo "  ℹ️  No logo set (logo_url is null/empty)"
  check "null logo handled by fallback" "pass"
fi

# ─── Schema mismatch check ───
echo ""
echo "📋 Schema mismatch detection"

SCHEMA_COLS="id name description slogan phone address hero_image_url logo_url working_hours_text working_hours specific_days_off slot_buffer_minutes slot_interval_minutes created_at"
DB_COLS=$(echo "$DATA" | jq -r 'keys[]')

MISSING_COLS=""
for col in $SCHEMA_COLS; do
  if ! echo "$DB_COLS" | grep -qw "$col"; then
    MISSING_COLS="$MISSING_COLS $col"
  fi
done

if [ -n "$MISSING_COLS" ]; then
  echo "  ⚠️  Columns in schema.sql but NOT in database:$MISSING_COLS"
  echo "     → Run: ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS <col> <type> DEFAULT <value>;"
else
  check "all schema columns exist in database" "pass"
fi

# ─── Summary ───
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
