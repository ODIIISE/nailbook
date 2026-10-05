import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contrast governance (Constitution P6 — WCAG AA floor).
 *
 * The Phase 11 hardening pass fixed 8 computed AA failures (worst: the
 * «تأیید شده» pill at 2.96:1) and created the missing
 * --destructive-foreground. This test makes that matrix permanent: it parses
 * the LIVE token values out of globals.css on every run, so any future token
 * change that breaks AA fails `npm run check` with a readable diff.
 *
 * Scope: the semantic layer pairings components actually produce, including
 * alpha-blended recipes (tinted pills, disabled text) and solid fills with
 * their foregrounds. Decorative watermarks (aria-hidden ornaments, giant
 * background numerals) are intentionally out of scope.
 *
 * Thresholds: 4.5:1 for text pairings, 3.0:1 for the focus ring (non-text UI,
 * WCAG 1.4.11).
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

const lightBlock = extractBlock(":root");
const darkBlock = extractBlock(".dark");
const sheetBlock = extractBlock(".sheet-light");

function hexOf(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`globals.css: --${name} has no direct hex value in its block`);
  return m[1].toLowerCase();
}

/** Resolve a custom property to a hex, following one level of var()
 * indirection into the primitives layer (shared by both themes). */
function resolve(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`globals.css: --${name} not found`);
  const value = m[1].trim();
  const hex = value.match(/#[0-9a-fA-F]{6}/);
  if (hex) return hex[0].toLowerCase();
  const varRef = value.match(/var\(--([\w-]+)\)/);
  if (varRef) {
    // Primitives are defined once in :root; look them up there.
    return hexOf(lightBlock, varRef[1]);
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

/* ── Theme snapshots ─────────────────────────────────────────────── */

type Theme = Record<string, string>;

function themeOf(block: string): Theme {
  return {
    background: resolve(block, "background"),
    foreground: resolve(block, "foreground"),
    card: resolve(block, "card"),
    muted: resolve(block, "muted"),
    "muted-foreground": resolve(block, "muted-foreground"),
    primary: resolve(block, "primary"),
    "primary-foreground": resolve(block, "primary-foreground"),
    secondary: resolve(block, "secondary"),
    "secondary-foreground": resolve(block, "secondary-foreground"),
    accent: resolve(block, "accent"),
    "accent-foreground": resolve(block, "accent-foreground"),
    "accent-soft": resolve(block, "accent-soft"),
    "accent-foreground-soft": resolve(block, "accent-foreground-soft"),
    destructive: resolve(block, "destructive"),
    "destructive-foreground": resolve(block, "destructive-foreground"),
    success: resolve(block, "success"),
    warning: resolve(block, "warning"),
    ring: resolve(block, "ring"),
  };
}

const LIGHT = themeOf(lightBlock);
const DARK = themeOf(darkBlock);

/* Sheet island theme: .sheet-light re-maps the semantic layer to a white
 * surface with black elements. Same solid-hex discipline as :root/.dark so
 * the matrix below reads it live. */
function sheetThemeOf(block: string): Theme {
  const pick = (name: string): string => {
    const m = block.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`));
    if (!m) throw new Error(`globals.css .sheet-light: --${name} has no direct 6-digit hex`);
    return m[1].toLowerCase();
  };
  return {
    background: pick("background"),
    foreground: pick("foreground"),
    card: pick("card"),
    muted: pick("muted"),
    "muted-foreground": pick("muted-foreground"),
    primary: pick("primary"),
    "primary-foreground": pick("primary-foreground"),
    secondary: pick("secondary"),
    "secondary-foreground": pick("secondary-foreground"),
    accent: pick("accent"),
    "accent-foreground": pick("accent-foreground"),
    "accent-soft": pick("accent-soft"),
    "accent-foreground-soft": pick("accent-foreground-soft"),
    destructive: pick("destructive"),
    "destructive-foreground": pick("destructive-foreground"),
    success: pick("success"),
    warning: pick("warning"),
    ring: pick("ring"),
  };
}

const SHEET = sheetThemeOf(sheetBlock);
const SHEET_ON_DARK = (() => {
  const m = sheetBlock.match(/--destructive-on-dark\s*:\s*(#[0-9a-fA-F]{6})\s*;/);
  if (!m) throw new Error("globals.css .sheet-light: --destructive-on-dark has no direct 6-digit hex");
  return m[1].toLowerCase();
})();

/* ── The matrix ──────────────────────────────────────────────────── */

interface Row {
  label: string;
  fg: string;
  bg: string;
  min: number;
}

function rowsFor(T: Theme): Row[] {
  /* Disabled recipe: foreground at 70% over a primary/15 tint on card.
     The /70 floor was set in Phase 11 (was /60 at 3.76:1). */
  const primaryTint = blend(T.primary, 0.15, T.card);
  const disabledFg = blend(T.foreground, 0.7, primaryTint);

  /* Tinted status pills (status-pill.tsx): text on its own color at 10%
     over card. */
  const pill = (key: "primary" | "success" | "warning" | "destructive") =>
    blend(T[key], 0.1, T.card);

  return [
    { label: "foreground on background", fg: T.foreground, bg: T.background, min: 4.5 },
    { label: "foreground on card", fg: T.foreground, bg: T.card, min: 4.5 },
    { label: "muted-foreground on background", fg: T["muted-foreground"], bg: T.background, min: 4.5 },
    { label: "muted-foreground on card", fg: T["muted-foreground"], bg: T.card, min: 4.5 },
    { label: "muted-foreground on muted", fg: T["muted-foreground"], bg: T.muted, min: 4.5 },
    { label: "primary-foreground on primary (buttons)", fg: T["primary-foreground"], bg: T.primary, min: 4.5 },
    { label: "secondary-foreground on secondary", fg: T["secondary-foreground"], bg: T.secondary, min: 4.5 },
    { label: "accent-foreground on accent", fg: T["accent-foreground"], bg: T.accent, min: 4.5 },
    { label: "accent-foreground-soft on accent-soft", fg: T["accent-foreground-soft"], bg: T["accent-soft"], min: 4.5 },
    { label: "destructive as text on card", fg: T.destructive, bg: T.card, min: 4.5 },
    { label: "success as text on card", fg: T.success, bg: T.card, min: 4.5 },
    { label: "warning as text on card", fg: T.warning, bg: T.card, min: 4.5 },
    { label: "destructive-foreground on destructive fill", fg: T["destructive-foreground"], bg: T.destructive, min: 4.5 },
    { label: "ring vs background (non-text UI)", fg: T.ring, bg: T.background, min: 3.0 },
    { label: "pill: primary/10 tint text", fg: T.primary, bg: pill("primary"), min: 4.5 },
    { label: "pill: success/10 tint text", fg: T.success, bg: pill("success"), min: 4.5 },
    { label: "pill: warning/10 tint text", fg: T.warning, bg: pill("warning"), min: 4.5 },
    { label: "pill: destructive/10 tint text", fg: T.destructive, bg: pill("destructive"), min: 4.5 },
    { label: "disabled foreground/70 on primary/15 tint", fg: disabledFg, bg: primaryTint, min: 4.5 },
  ];
}

function stateRows(T: Theme, scope: string, card: string, muted: string): Row[] {
  /* Glyph tones actually used inside .icon-btn: foreground glyphs
   * (route back buttons) and muted glyphs (row actions). */
  return [
    { label: `${scope} back glyph on card`, fg: T.foreground, bg: card, min: 4.5 },
    { label: `${scope} back glyph on hover fill`, fg: T.foreground, bg: muted, min: 4.5 },
    { label: `${scope} muted glyph on card`, fg: T["muted-foreground"], bg: card, min: 4.5 },
    { label: `${scope} muted glyph on hover fill`, fg: T["muted-foreground"], bg: muted, min: 4.5 },
    /* Primary button hover: fill darkens toward the card it sits on. */
    {
      label: `${scope} primary label on hover fill`,
      fg: T["primary-foreground"],
      bg: blend(T.primary, 0.85, card),
      min: 4.5,
    },
    /* Destructive outline button: tinted fill + tinted text on card. */
    {
      label: `${scope} destructive outline on card`,
      fg: T.destructive,
      bg: blend(T.destructive, 0.1, card),
      min: 4.5,
    },
    {
      label: `${scope} destructive fill label`,
      fg: T["destructive-foreground"],
      bg: T.destructive,
      min: 4.5,
    },
  ];
}

function sheetRows(): Row[] {
  const T = SHEET;
  const cardFg60 = blend("#ffffff", 0.6, T.card);
  const chipOnBlack = blend("#ffffff", 0.15, T.primary);
  return [
    { label: "sheet text on white", fg: T.foreground, bg: T.background, min: 4.5 },
    { label: "sheet card text on black card", fg: "#ffffff", bg: T.card, min: 4.5 },
    { label: "sheet dim text on black card", fg: cardFg60, bg: T.card, min: 4.5 },
    { label: "sheet muted text on white", fg: T["muted-foreground"], bg: T.background, min: 4.5 },
    { label: "sheet muted text on muted fill", fg: T["muted-foreground"], bg: T.muted, min: 4.5 },
    { label: "sheet button label on black fill", fg: T["primary-foreground"], bg: T.primary, min: 4.5 },
    { label: "sheet destructive text on white", fg: T.destructive, bg: T.background, min: 4.5 },
    { label: "sheet destructive fill label", fg: T["destructive-foreground"], bg: T.destructive, min: 4.5 },
    { label: "sheet danger text on black card", fg: SHEET_ON_DARK, bg: T.card, min: 4.5 },
    { label: "sheet success text on white", fg: T.success, bg: T.background, min: 4.5 },
    { label: "sheet warning text on white", fg: T.warning, bg: T.background, min: 4.5 },
    { label: "sheet icon glyph on black disc", fg: "#ffffff", bg: T.card, min: 4.5 },
    { label: "sheet icon glyph on disc hover", fg: "#ffffff", bg: "#2e2e2e", min: 4.5 },
    { label: "sheet CTA chip text on chip fill", fg: "#ffffff", bg: chipOnBlack, min: 4.5 },
    ...stateRows(T, "sheet", T.background, T.muted),
  ];
}

describe.each([
  ["light", LIGHT],
  ["dark", DARK],
])("contrast governance — %s theme (live globals.css)", (_name, T) => {
  it.each([...rowsFor(T), ...stateRows(T, _name as string, T.card, T.muted)])("$label ≥ $min:1", ({ label, fg, bg, min }) => {
    const ratio = contrast(fg, bg);
    if (ratio < min) {
      throw new Error(
        `AA FAILURE: ${label} = ${ratio.toFixed(2)}:1 (needs ${min}:1).\n` +
          `  fg ${fg} on bg ${bg}. Fix the token in src/app/globals.css —\n` +
          `  see docs/AUDIT-008-hardening.md for the Phase 11 matrix.`
      );
    }
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

describe("contrast governance — sheet island (live .sheet-light)", () => {
  it.each(sheetRows())("$label ≥ $min:1", ({ label, fg, bg, min }) => {
    const ratio = contrast(fg, bg);
    if (ratio < min) {
      throw new Error(
        `AA FAILURE: ${label} = ${ratio.toFixed(2)}:1 (needs ${min}:1).\n` +
          `  fg ${fg} on bg ${bg}. Fix the token in src/app/globals.css (.sheet-light scope).`
      );
    }
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

describe("contrast governance — matrix integrity", () => {
  it("destructive-foreground exists in both themes (was missing before Phase 11)", () => {
    expect(() => resolve(lightBlock, "destructive-foreground")).not.toThrow();
    expect(() => resolve(darkBlock, "destructive-foreground")).not.toThrow();
  });

  it("semantic feedback hues differ between themes (mode-stable but theme-adjusted)", () => {
    expect(DARK.destructive).not.toBe(LIGHT.destructive);
    expect(DARK.success).not.toBe(LIGHT.success);
  });
});
