import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Files allowed to reference these patterns: this test itself (it defines the
// patterns), haptics (vibration feedback is not visual motion), and the Lux
// homepage (motion is an explicit, user-approved part of that approved mock;
// the rest of the app remains motion-free).
const ALLOWED = (file: string) => {
  const f = file.replaceAll("\\", "/");
  return (
    f.includes("no-motion.test") ||
    f.endsWith("src/lib/haptics.ts") ||
    f.endsWith("src/components/landing/lux-home.module.css") ||
    f.endsWith("src/components/landing/lux-home.tsx")
  );
};

const MOTION = ["framer-motion", "tw-animate-css"].map((s) => new RegExp(s));
const CSS_PROP = /\b(transition|animation|will-change)\s*:/;
const TAILWIND = /\b(transition|duration|ease|delay)-(all|colors|opacity|transform|height|width|in|out|linear|ease|initial|150|200|300|450)\b/;
const ANIMATE = /\banimate-(in|out|spin|pulse|bounce|ping|fade|zoom|slide|scale|flip|expand|collapse)\b/;
const KEYFRAMES = /@keyframes\s/;
const VIEW_TRANSITIONS = /startViewTransition|view-transition/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

describe("no-motion gate", () => {
  it("src/ contains zero motion code", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      if (ALLOWED(file)) continue;
      const text = readFileSync(file, "utf8");
      const hit = [MOTION, CSS_PROP, TAILWIND, ANIMATE, KEYFRAMES, VIEW_TRANSITIONS]
        .flat()
        .find((pattern) => pattern.test(text));
      if (hit) offenders.push(`${file}: ${hit.source}`);
    }
    expect(offenders, `motion code found in:\n${offenders.join("\n")}`).toEqual([]);
  });
});
