# Booking flow visual pass — 375px & 390px, RTL.
# Drives service select → date/time → review (+ OTP via dev server log) → success.
# Screenshots + console errors + overflow report land in qa/booking-pass/.
import io
import json
import re
import sys
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:1787"
OUT = Path(__file__).parent
DEV_LOG = Path(".next/dev/logs/next-development.log")
RUN_ID = str(int(time.time()))[-5:]

def phone_for(width):
    """Unique per width — anti-spam and OTP cooldown key on phone."""
    return f"0912{RUN_ID}{width % 100:02d}"

report = {}


def doc_overflow(page):
    return page.evaluate("""() => {
      const d = document.documentElement;
      const bad = [];
      const w = d.clientWidth;
      const inScroller = (el) => {
        for (let a = el.parentElement; a; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > w + 1 || r.left < -1) && !inScroller(el)) {
          const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 80) : '';
          bad.push(`${el.tagName.toLowerCase()}.${cls} L=${Math.round(r.left)} R=${Math.round(r.right)}`);
        }
      }
      return { scrollW: d.scrollWidth, clientW: w, offenders: bad.slice(0, 12) };
    }""")


def log_size():
    return DEV_LOG.stat().st_size if DEV_LOG.exists() else 0


def read_otp_code(phone, since):
    """Newest OTP for this phone, only from log content written after `since`."""
    if not DEV_LOG.exists():
        return None
    with DEV_LOG.open("r", encoding="utf-8", errors="ignore") as fh:
        fh.seek(since)
        text = fh.read()
    matches = re.findall(rf"\[SMS\] OTP for {phone}: (\d{{6}})", text)
    return matches[-1] if matches else None


def snap(page, name, width):
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path))
    ov = doc_overflow(page)
    report[f"{name}@{width}"] = ov
    print(f"  📸 {path.name} overflow={ov['scrollW']}>{ov['clientW']}? {ov['scrollW'] > ov['clientW']} offenders={len(ov['offenders'])}")
    for o in ov["offenders"][:5]:
        print(f"     ⚠ {o}")


def run_width(browser, width):
    print(f"\n=== {width}px ===")
    ctx = browser.new_context(viewport={"width": width, "height": 740}, locale="fa-IR", timezone_id="Asia/Tehran")
    page = ctx.new_page()
    phone = phone_for(width)
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    report[f"errors@{width}"] = errors

    try:
        # ── Step 1: service select ──
        page.goto(f"{BASE}/book", wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_selector("button:has-text('انتخاب')", timeout=30_000)
        time.sleep(1.2)  # reveal animations settle
        snap(page, "1-service", width)

        # expand first card (addons list)
        page.locator("button[aria-expanded]", has_text="انتخاب").first.click()
        time.sleep(0.9)
        snap(page, "1b-service-expanded", width)

        # ── Step 2: date/time ──
        page.locator("footer button").click()
        page.wait_for_selector("text=انتخاب تاریخ", timeout=20_000)
        time.sleep(1.2)
        snap(page, "2-time", width)

        # pick first enabled day, then first available slot
        day = page.locator(".overflow-x-auto button:not([disabled])").first
        day.click()
        time.sleep(0.8)
        slot = page.locator("button[aria-label*='موجود']").first
        if slot.count() == 0:
            # day may be fully booked → empty state; click "next day" button
            nxt = page.locator("button:has-text('روز بعد'), button:has-text('برنامه فردا')").first
            if nxt.count():
                nxt.click()
                time.sleep(0.8)
                slot = page.locator("button[aria-label*='موجود']").first
        slot.click()
        time.sleep(0.6)
        snap(page, "2b-time-selected", width)

        # ── Step 3: review ──
        page.locator("footer button").click()
        page.wait_for_selector("text=مشخصات شما", timeout=20_000)
        time.sleep(1.0)
        snap(page, "3-review", width)

        page.fill("#booking-name", "سارا تستی")
        page.fill("#booking-phone", phone)
        otp_since = log_size()
        page.locator("button:has-text('دریافت کد تأیید')").click()
        page.wait_for_selector("input[type='tel']:not(#booking-phone)", timeout=20_000)
        time.sleep(0.6)
        snap(page, "3a-review-otpsent", width)

        code = None
        for _ in range(40):
            time.sleep(0.5)
            code = read_otp_code(phone, otp_since)
            if code:
                break
        if not code:
            print("  ✗ OTP code never appeared in dev log")
            snap(page, "3b-review-otp-fail", width)
            raise RuntimeError("no OTP in dev log")
        print(f"  🔑 OTP: {code}")

        pin = page.locator("input[type='tel']:not(#booking-phone)").first
        pin.click()
        page.keyboard.type(code, delay=60)
        page.wait_for_selector("text=شماره تأیید شد", timeout=20_000)
        time.sleep(0.6)
        snap(page, "3b-review-verified", width)

        # ── Step 4: success ──
        for _ in range(30):
            page.locator("footer button").click()
            try:
                page.wait_for_selector("text=افزودن به تقویم", timeout=6_000)
                break
            except Exception:
                pass
        else:
            raise RuntimeError("booking never reached success step")
        time.sleep(1.2)
        snap(page, "4-success", width)

    except Exception as exc:
        print(f"  ✗ FAILED at {width}px: {exc}")
        snap(page, "z-fail", width)
        report[f"fail@{width}"] = str(exc)
    finally:
        if errors:
            print(f"  console errors: {len(errors)}")
            for e in errors[:8]:
                print(f"    • {e[:160]}")
        ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    for w in (390, 375):
        run_width(browser, w)
    browser.close()

(OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("\nreport.json written")
