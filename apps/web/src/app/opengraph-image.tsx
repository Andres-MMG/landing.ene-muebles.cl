import { ImageResponse } from "next/og";

/**
 * Root Open Graph image (B2/U11) — generated via the `opengraph-image`
 * file convention so every route WITHOUT its own OG image inherits a
 * branded, truthful asset instead of nothing. Product pages override
 * it with their own cover image (see `producto/[slug]/page.tsx`).
 *
 * Brand tokens come from `packages/ui-tokens` (ink #2C2C2C, paper
 * #F9F8F6, taupe accent; taupe-text/ink-mute are the WCAG-safe text
 * shades). Static at build time (`dynamic = "force-static"`), so the
 * font fetch below runs once and a network hiccup degrades to the
 * ImageResponse default sans-serif instead of failing the build.
 */

export const alt =
  "ENE Muebles — Mobiliario institucional · Catálogo · Despacho a todo Chile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

type BrandFont = {
  name: string;
  data: ArrayBuffer;
  weight: 600;
  style: "normal";
};

/** Best-effort Hanken Grotesk (the site body font). Empty on failure. */
async function loadBrandFont(): Promise<BrandFont[]> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600&display=swap",
      { signal: AbortSignal.timeout(8000) }
    ).then((response) => response.text());
    const woff2Url = css.match(/src: url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!woff2Url) return [];
    const data = await fetch(woff2Url, {
      signal: AbortSignal.timeout(8000),
    }).then((response) => response.arrayBuffer());
    return [{ name: "Hanken Grotesk", data, weight: 600, style: "normal" }];
  } catch {
    return [];
  }
}

export default async function OpengraphImage() {
  const fonts = await loadBrandFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F9F8F6",
          color: "#2C2C2C",
          fontFamily: "Hanken Grotesk, sans-serif",
          padding: "72px 80px",
        }}
      >
        {/* Kicker — same taupe-rule + mono-label pattern as the site. */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 48, height: 2, background: "#A69076" }} />
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#7A6650",
            }}
          >
            ENE-MUEBLES · Proveedor institucional
          </div>
        </div>

        {/* Headline — institutional positioning, BLUF. */}
        <div
          style={{
            marginTop: 40,
            fontSize: 92,
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
            maxWidth: 920,
          }}
        >
          Mobiliario institucional
        </div>

        {/* Subline — verified service facts, no invented claims. */}
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: "#656565",
          }}
        >
          Catálogo 2026 · Despacho a todo Chile · Cotización en 24 h
        </div>

        {/* Bottom rail — brand readout like the site footer. */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #2C2C2C",
            paddingTop: 24,
            fontSize: 18,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#2C2C2C",
          }}
        >
          <span>ENE-MUEBLES — Fabricación y distribución</span>
          <span>Chile</span>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
