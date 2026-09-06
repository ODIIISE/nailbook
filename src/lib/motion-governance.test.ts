import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Motion governance (design system §20–22).
 *
 * Motion is allowed, but only through the system:
 *  - globals.css defines the token vocabulary (--duration-* / --ease-*).
 *  - The Editorial homepage (lux-home) is the approved expressive mode.
 *  - Stock primitives in src/components/ui/ carry their own base-ui motion.
 *  - Everything else (Atelier: app routes, booking, owner) stays motion-free —
 *    state changes there are instant or come from the primitives they compose.
 *
 * Banned globally: animation libraries (framer-motion, tw-animate-css) and
 * View Transitions.
 */

const EDITORIAL = (f: string) =>
  f.endsWith("src/components/landing/lux-home.module.css") ||
  f.endsWith("src/components/landing/lux-home.tsx");

const STOCK_PRIMITIVES = (f: string) => f.includes("src/components/ui/");

const SYSTEM = (f: string) =>
  f.endsWith("src/app/globals.css") || f.endsWith("motion-governance.test.ts");

const HAPTICS = (f: string) => f.endsWith("src/lib/haptics.ts");

const LIBS = ["framer-motion", "tw-animate-css"].map((s) => new RegExp(s));
const CSS_MOTION = /\b(transition|animation|will-change)\s*:|@keyframes\s/;
const RAW_DURATION = /(?<![\w-])(\d{1,4}ms|\.?\d+(\.\d+)?s)\b(?!\s*[,)]*(?:\s*var|--)|-)/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

describe("motion governance", () => {
  it("no animation libraries anywhere", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const f = file.replaceAll("\\", "/");
      if (SYSTEM(f)) continue;
      const text = readFileSync(file, "utf8");
      if (LIBS.some((p) => p.test(text))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("CSS motion exists only in the system, Editorial mode, and stock primitives", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const f = file.replaceAll("\\", "/");
      if (EDITORIAL(f) || STOCK_PRIMITIVES(f) || SYSTEM(f) || HAPTICS(f)) continue;
      const text = readFileSync(file, "utf8");
      if (CSS_MOTION.test(text)) offenders.push(`${file}: ${CSS_MOTION.source}`);
    }
    expect(offenders, `raw motion code found in:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("app-level CSS (non-Editorial, non-stock) uses motion tokens, not raw durations", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const f = file.replaceAll("\\", "/");
      if (SYSTEM(f) || EDITORIAL(f) || STOCK_PRIMITIVES(f) || HAPTICS(f)) continue;
      if (!f.endsWith(".css")) continue; // durations only matter inside CSS
      const text = readFileSync(file, "utf8");
      const m = text.match(RAW_DURATION);
      if (m) offenders.push(`${file}: raw duration "${m[0]}"`);
    }
    expect(offenders, `raw durations found (use --duration-* tokens):\n${offenders.join("\n")}`).toEqual([]);
  });
});
