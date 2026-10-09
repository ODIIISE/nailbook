import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contrast governance (Studio v3 — WCAG AA floor on the warm palette).
 *
 * Single dark theme: :root and .dark carry identical values, so the matrix
 * runs once against :root and an integrity test pins the mirror. It parses
 * the LIVE token values out of globals.css on every run, so any future token
 * change that breaks AA fails `npm run check` with a readable diff.
 *
 * Scope: the semantic layer pairings components actually produce, including
 * alpha-blended recipes (tinted pills, tone badges, disabled text) and solid
 * fills with their foregrounds. Decorative watermarks (aria-hidden
 * ornaments, giant background numerals) are intentionally out of scope.
 *
 * Thresholds: 4.5:1 for text pairings, 3.0:1 for the focus ring (non-text UI,
 * WCAG 1.4.11) and for the faint decorative metadata tier (dow initials,
 * tone-mute labels — never body, buttons, or inputs).
 */

const cssPath = join(__dirname, "..", "app", "globals.css");
const css = readFileSync(cssPath, "utf-8");

/* ── CSS parsing ─────────────────────────────────────────────────── */

function extractBlock(selector: string): string {
  // Match the top-level block whose selector is exactly `selector`
  // (handles `:root {` and `.dark {`).
  const re = new RegExp(`^${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const m = css.match(re);
  if (!m) throw new Error(`globals.css: block "${selector}" not found`);
  return m[1];
}

const rootBlock = extractBlock(":root");
const darkBlock = extractBlock(".dark");

function hexOf(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`globals.css: --${name} has no direct hex value in its block`);
  return m[1].toLowerCase();
}

/** Resolve a custom property to a hex, following one level of var()
 * indirection into the primitives layer (defined once in :root). */
function resolve(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`globals.css: --${name} not found`);
  const value = m[1].trim();
  const hex = value.match(/#[0-9a-fA-F]{6}/);
  if (hex) return hex[0].toLowerCase();
  const varRef = value.match(/var\(--([\w-]+)\)/);
  if (varRef) {
    // Primitives are defined once in :root; look them up there.
    return hexOf(rootBlock, varRef[1]);
  }
  throw new Error(`globals.css: --${name} = "${value}" is not resolvable to a hex`);
}

/* ── WCAG math ───────────────────────────────────────────────────── */

function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
/** Composite `fg` at alpha over opaque `bg`. */
function blend(fg: string, alpha: number, bg: string): string {
  const f = fg.replace("#", "");
  const b = bg.replace("#", "");
  const out = [0, 2, 4]
    .map((i) => {
      const c = Math.round(
        parseInt(f.slice(i, i + 2), 16) * alpha + parseInt(b.slice(i, i + 2), 16) * (1 - alpha)
      );
      return c.toString(16).padStart(2, "0");
    })
    .join("");
  return `#${out}`;
}

/* ── Theme snapshot ──────────────────────────────────────────────── */

type Theme = Record<string, string>;

function themeOf(block: string): Theme {
  return {
    background: resolve(block, "background"),
    foreground: resolve(block, "foreground"),
    card: resolve(block, "card"),
    muted: resolve(block, "muted"),
    primary: resolve(block, "primary"),
    "primary-foreground": resolve(block, "primary-foreground"),
    secondary: resolve(block, "secondary"),
    "secondary-foreground": resolve(block, "secondary-foreground"),
    accent: resolve(block, "accent"),
    "accent-foreground": resolve(block, "accent-foreground"),
    "accent-foreground-soft": resolve(block, "accent-foreground-soft"),
    destructive: resolve(block, "destructive"),
    "destructive-foreground": resolve(block, "destructive-foreground"),
    success: resolve(block, "success"),
    warning: resolve(block, "warning"),
    ring: resolve(block, "ring"),
  };
}

const T = themeOf(rootBlock);

/* Muted tiers are rgba over surfaces — composite per pairing. The alphas
 * below must match the :root --mute/--faint declarations (pinned by the
 * integrity test). */
const INK = "#efe7db";
const MUTE_A = 0.62;
const FAINT_A = 0.38;

/* Tone badge recipes (.badge.tone-* in globals.css): text hex on its own
 * tint composited over card. Values mirror the kit classes. */
const TONES: Array<{ label: string; fg: string; tint: string }> = [
  { label: "tone-gold", fg: "#e6c88a", tint: "#d4b06a" },
  { label: "tone-wine", fg: "#eaa0ad", tint: "#8c2a3a" },
  { label: "tone-sage", fg: "#bfcdb0", tint: "#a9b79a" },
  { label: "tone-rose", fg: "#e3bfb1", tint: "#c7a08e" },
  { label: "tone-pearl", fg: "#e9dcc3", tint: "#e9dcc3" },
];

/* ── The matrix ──────────────────────────────────────────────────── */

interface Row {
  label: string;
  fg: string;
  bg: string;
  min: number;
}

function rows(): Row[] {
  /* Disabled recipe: foreground at 70% over a primary/15 tint on card. */
  const primaryTint = blend(T.primary, 0.15, T.card);
  const disabledFg = blend(T.foreground, 0.7, primaryTint);

  /* Tinted status pills: text on its own color at 10% over card. */
  const pill = (hex: string) => blend(hex, 0.1, T.card);

  const rows: Row[] = [
    { label: "foreground on background", fg: T.foreground, bg: T.background, min: 4.5 },
    { label: "foreground on card", fg: T.foreground, bg: T.card, min: 4.5 },
    { label: "muted text on background", fg: blend(INK, MUTE_A, T.background), bg: T.background, min: 4.5 },
    { label: "muted text on card", fg: blend(INK, MUTE_A, T.card), bg: T.card, min: 4.5 },
    { label: "muted text on muted fill", fg: blend(INK, MUTE_A, T.muted), bg: T.muted, min: 4.5 },
    { label: "primary-foreground on primary (buttons)", fg: T["primary-foreground"], bg: T.primary, min: 4.5 },
    { label: "secondary-foreground on secondary", fg: T["secondary-foreground"], bg: T.secondary, min: 4.5 },
    { label: "accent-foreground on accent", fg: T["accent-foreground"], bg: T.accent, min: 4.5 },
    { label: "accent-foreground-soft on accent-soft", fg: T["accent-foreground-soft"], bg: blend(T.accent, 0.12, T.card), min: 4.5 },
    { label: "destructive as text on card", fg: T.destructive, bg: T.card, min: 4.5 },
    { label: "success as text on card", fg: T.success, bg: T.card, min: 4.5 },
    { label: "warning as text on card", fg: T.warning, bg: T.card, min: 4.5 },
    { label: "destructive-foreground on destructive fill", fg: T["destructive-foreground"], bg: T.destructive, min: 4.5 },
    { label: "ring vs background (non-text UI)", fg: T.ring, bg: T.background, min: 3.0 },
    { label: "pill: primary/10 tint text", fg: T.primary, bg: pill(T.primary), min: 4.5 },
    { label: "pill: success/10 tint text", fg: T.success, bg: pill(T.success), min: 4.5 },
    { label: "pill: warning/10 tint text", fg: T.warning, bg: pill(T.warning), min: 4.5 },
    { label: "pill: destructive/10 tint text", fg: T.destructive, bg: pill(T.destructive), min: 4.5 },
    { label: "disabled foreground/70 on primary/15 tint", fg: disabledFg, bg: primaryTint, min: 4.5 },
    /* Icon glyphs inside .iconbtn: foreground and muted glyphs on glass
     * (glass over background reads as background here). */
    { label: "icon glyph on glass", fg: T.foreground, bg: T.background, min: 4.5 },
    { label: "muted icon glyph on glass", fg: blend(INK, MUTE_A, T.card), bg: T.card, min: 4.5 },
    /* Primary hover: pearl gradient brightens — still AA. */
    {
      label: "primary label on hover fill",
      fg: T["primary-foreground"],
      bg: blend("#ffffff", 0.05, T.primary),
      min: 4.5,
    },
  ];
  for (const tone of TONES) {
    rows.push({
      label: `badge ${tone.label} text on tint`,
      fg: tone.fg,
      bg: blend(tone.tint, 0.1, T.card),
      min: 4.5,
    });
  }
  /* Faint tier (dow initials, tone-mute labels): decorative metadata only —
   * never body, buttons, or inputs. Tracked at the non-text floor. */
  rows.push({
    label: "faint metadata on card (decorative only)",
    fg: blend(INK, FAINT_A, T.card),
    bg: T.card,
    min: 3.0,
  });
  return rows;
}

describe("contrast governance — studio theme (live globals.css)", () => {
  it.each(rows())("$label ≥ $min:1", ({ label, fg, bg, min }) => {
    const ratio = contrast(fg, bg);
    if (ratio < min) {
      throw new Error(
        `AA FAILURE: ${label} = ${ratio.toFixed(2)}:1 (needs ${min}:1).\n` +
          `  fg ${fg} on bg ${bg}. Fix the token in src/app/globals.css.`
      );
    }
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

describe("contrast governance — matrix integrity", () => {
  it("sole theme: .dark mirrors :root on every semantic token", () => {
    for (const name of Object.keys(T)) {
      expect(resolve(darkBlock, name), `.dark --${name}`).toBe(T[name]);
    }
  });

  it("muted tiers match the spec alphas", () => {
    expect(rootBlock).toMatch(/--mute:\s*rgba\(239,\s*231,\s*219,\s*0\.62\)/);
    expect(rootBlock).toMatch(/--faint:\s*rgba\(239,\s*231,\s*219,\s*0\.38\)/);
  });

  it("destructive-foreground exists (was missing before Phase 11)", () => {
    expect(() => resolve(rootBlock, "destructive-foreground")).not.toThrow();
    expect(() => resolve(darkBlock, "destructive-foreground")).not.toThrow();
  });
});
