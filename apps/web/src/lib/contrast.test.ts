import { describe, expect, it } from "vitest";
import { colors } from "@ene/ui-tokens";

/**
 * WCAG 2.1 AA contrast regression gate (B2/U10).
 *
 * Asserts the DEFINED text/UI token pairs over their real surfaces so
 * a future palette tweak that silently breaks a text pairing fails the
 * suite instead of shipping. Hex values come from
 * `packages/ui-tokens/src/colors.ts` (mirror of `tokens.css`).
 *
 * WCAG thresholds: body-size text ≥ 4.5:1, large text / UI ≥ 3:1.
 */

// --- WCAG 2.1 relative-luminance helpers ----------------------------------

function channelToLinear(component: number): number {
  const c = component / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = channelToLinear(parseInt(h.slice(0, 2), 16));
  const g = channelToLinear(parseInt(h.slice(2, 4), 16));
  const b = channelToLinear(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** One pair = (name, background, foreground). */
type Pair = [string, string, string];

describe("WCAG AA contrast — text tokens over paper", () => {
  // Body-size text pairs: every small label / SKU / kicker / muted
  // description rendered over the light paper surface MUST be ≥ 4.5:1.
  const bodyPairs: Pair[] = [
    ["paper × ink (headings, body)", colors.paper, colors.ink],
    ["paper × ink-soft-text (labels, SKUs, kickers)", colors.paper, colors.inkSoftText],
    ["paper × taupe-text (kickers, chips)", colors.paper, colors.taupeText],
    // ink-mute is now the small-text legibility token (typography pass):
    // the runtime color-mix over paper renders ≈6.7:1 — well above the
    // 4.5:1 floor, and the solid approximation below stays conservative.
    ["paper × ink-mute (muted descriptions)", colors.paper, colors.inkMute],
  ];

  it.each(bodyPairs)("%s → ratio ≥ 4.5:1", (_name: string, background: string, foreground: string) => {
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("WCAG AA contrast — dark-section text tokens", () => {
  // Pairs used ONLY on the ink sections (ContactCTA, AboutSection,
  // Footer, ContactForm). Left untouched by the U10 swap — they pass
  // 4.5:1 already.
  const darkPairs: Pair[] = [
    ["ink × paper (dark section body)", colors.ink, colors.paper],
    ["ink × taupe (dark-section kickers, links)", colors.ink, colors.taupe],
    ["ink × error #FFB4AB (ContactForm errors)", colors.ink, colors.errorOnDark],
  ];

  it.each(darkPairs)("%s → ratio ≥ 4.5:1", (_name: string, background: string, foreground: string) => {
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("WCAG AA contrast — large-text / UI pairs kept at ≥ 3:1", () => {
  // taupe-deep stays for LARGE text only (headings ≥ 20px semibold and
  // ordinal numerals ≥ 24px, both over paper): large-text threshold is
  // 3:1 and the pair measures ≈4.2:1. Small-text usages were swapped
  // to taupe-text. taupe-deep also remains for backgrounds/borders.
  const keptPairs: Pair[] = [
    ["paper × taupe-deep (large headings, hover)", colors.paper, colors.taupeDeep],
  ];

  it.each(keptPairs)("%s → ratio ≥ 3.0:1", (_name: string, background: string, foreground: string) => {
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(3.0);
  });

  it("documents the measured ratios that motivated the swap", () => {
    // Regression narrative: the old text pairings over paper failed
    // AA for small text. If a future change re-introduces them as text
    // colors, this assertion reminds the reader WHY the text tokens
    // exist. (Values computed with the same helpers above.)
    const legacy: Pair[] = [
      ["paper × ink-soft (old label color)", colors.paper, "#ABAAA9"],
      ["paper × taupe (old kicker color)", colors.paper, colors.taupe],
      ["paper × taupe-deep (old chip color)", colors.paper, colors.taupeDeep],
    ];
    for (const [name, bg, fg] of legacy) {
      expect(contrastRatio(bg, fg), `${name} must stay below AA`).toBeLessThan(4.5);
    }
  });
});
