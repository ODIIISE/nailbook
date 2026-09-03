---
name: visual-review
description: Workflow for reviewing rendered UI of this app in a real browser — launch dev server, screenshot desktop/mobile, check RTL and console errors, find and fix the highest-impact visual/UX issues. Use after implementing or changing UI.
---

# Visual Review

Verify the rendered product, not the source code. Compiling is not done.

## 1. Render

```bash
npm run dev
```

Use the `webapp-testing` skill (`scripts/with_server.py`) to manage server lifecycle. Write native Python Playwright scripts — **always** launch with `channel="msedge"` (the Chromium download is blocked on this machine):

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    page = b.new_page(viewport={"width": 390, "height": 844})  # mobile
    page.goto("http://localhost:3000/route")
```

## 2. Inspect

- Screenshot at desktop (≥1280px) and mobile (~390px); this is an RTL app — check both.
- Collect console messages and failed requests in the same script; a clean render with console errors is not done.
- Check: composition, alignment, spacing rhythm, typography scale (`.text-display`…`.text-caption`), color roles, borders/radius, elevation, iconography, motion restraint.
- Responsive: overflow, touch targets ≥44px, content priority, navigation adaptation, text wrapping.
- RTL/Persian: logical layout holds, Persian wraps naturally, `dir="ltr"` on phone numbers/times, Jalali dates, Persian digits.
- States: empty, loading, error, partial — not just the happy path.

## 3. Prioritize structural issues before pixel-level ones

1. Page composition → 2. containers/grid → 3. hierarchy → 4. typography → 5. spacing → 6. component dimensions → 7. colors/surfaces → 8. borders/radius/shadows → 9. interactions/motion → 10. micro-polish.

## 4. Fix and re-render

Fix the three highest-impact issues, re-render, confirm. When iterating on an existing design, take before/after screenshots at the same viewport. Compare against references (`mockups/*.html`, screenshots) structurally, never pixel-perfect.

Run `npm run check` at the end.
