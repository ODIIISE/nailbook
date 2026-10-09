import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Motion governance (design system §6, Studio v3).
 *
 * Motion is allowed through exactly two channels:
 *  - framer-motion in components (springs, AnimatePresence, layoutId, drag),
 *    globally bound by <MotionConfig reducedMotion="user"> in providers.tsx.
 *  - System CSS in globals.css (token vocabulary --duration-* / --ease-* /
 *    --spring plus the v2 kit classes).
 *  - The homepage keeps its approved expressive mode.
 *  - Stock primitives in src/components/ui/ carry their own base-ui motion.
 *
 * Banned globally: other animation libraries (tw-animate-css) and
 * View Transitions. Raw CSS motion outside those channels is rejected.
 */

const HOMEPAGE = (f: string) =>
  f.endsWith("src/components/landing/lux-home.module.css") ||
  f.endsWith("src/components/landing/lux-home.tsx");

const STOCK_PRIMITIVES = (f: string) => f.includes("src/components/ui/");

const SYSTEM = (f: string) =>
  f.endsWith("src/app/globals.css") || f.endsWith("motion-governance.test.ts");

const HAPTICS = (f: string) => f.endsWith("src/lib/haptics.ts");
// Contract-test files quote CSS snippets in assertions; they are not UI code.
const TESTS = (f: string) => f.includes(".test.");

const LIBS = ["tw-animate-css"].map((s) => new RegExp(s));
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

/** framer-motion usage is governed motion (MotionConfig + reduced-motion). */
function usesFramer(text: string): boolean {
  return text.includes('from "framer-motion"');
}

describe("motion governance", () => {
  it("no banned animation libraries anywhere", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const f = file.replaceAll("\\", "/");
      if (SYSTEM(f)) continue;
      const text = readFileSync(file, "utf8");
      if (LIBS.some((p) => p.test(text))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("CSS motion exists only in the system, homepage, stock primitives, and framer-motion components", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const f = file.replaceAll("\\", "/");
      if (HOMEPAGE(f) || STOCK_PRIMITIVES(f) || SYSTEM(f) || HAPTICS(f) || TESTS(f)) continue;
      const text = readFileSync(file, "utf8");
      if (usesFramer(text)) continue;
      if (CSS_MOTION.test(text)) offenders.push(`${file}: ${CSS_MOTION.source}`);
    }
    expect(offenders, `raw motion code found in:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("app-level CSS (non-homepage, non-stock) uses motion tokens, not raw durations", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const f = file.replaceAll("\\", "/");
      if (SYSTEM(f) || HOMEPAGE(f) || STOCK_PRIMITIVES(f) || HAPTICS(f)) continue;
      if (!f.endsWith(".css")) continue; // durations only matter inside CSS
      const text = readFileSync(file, "utf8");
      const m = text.match(RAW_DURATION);
      if (m) offenders.push(`${file}: raw duration "${m[0]}"`);
    }
    expect(offenders, `raw durations found (use --duration-* tokens):\n${offenders.join("\n")}`).toEqual([]);
  });
});
