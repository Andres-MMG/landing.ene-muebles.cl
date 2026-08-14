/**
 * Palette hex values mirrored from `tokens.css` so tooling that cannot
 * read CSS custom properties (vitest, contrast auditors, design checks)
 * can assert WCAG ratios numerically.
 *
 * KEEP IN SYNC with `tokens.css` — the CSS `@theme` block is the
 * runtime source of truth; this module exists for testability only.
 *
 * Contrast notes (B2/U10), over `paper` #F9F8F6:
 *   - `inkSoftText`  #6A6969 — visual ≈ ink @70 % over paper; 5.17:1
 *   - `taupeText`    #7A6650 — darkened taupe;                5.19:1
 *   - `inkMute`      #656565 — sRGB alpha-composite approximation of
 *     `color-mix(in oklch, ink 72 %, transparent)` over paper
 *     (≈5.5:1). The browser composites in oklch, which renders
 *     marginally LIGHTER — the approximation is conservative.
 */
export const colors = {
  ink: "#2C2C2C",
  taupe: "#A69076",
  taupeDeep: "#8A7560",
  cream: "#EBE2D9",
  paper: "#F9F8F6",
  // Text-safe aliases (WCAG AA) — solid hex so contrast is exact.
  inkSoftText: "#6A6969",
  taupeText: "#7A6650",
  // Composite approximations (see notes above).
  inkMute: "#656565",
  // Form error text on the ink section (ContactForm).
  errorOnDark: "#FFB4AB",
} as const;
