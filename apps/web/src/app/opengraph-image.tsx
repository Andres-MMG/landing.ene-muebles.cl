import { ImageResponse } from "next/og";
import { FALLBACK_SITE_SETTINGS, getSiteSettings } from "@/lib/strapi";
import {
  FALLBACK_SHARE_IMAGE_ALT,
  FALLBACK_SHARE_IMAGE_DESCRIPTION,
  FALLBACK_SHARE_IMAGE_FOOTER,
  FALLBACK_SHARE_IMAGE_KICKER,
  FALLBACK_SHARE_IMAGE_TITLE,
  resolveSeoText,
} from "@/lib/seo-metadata";

/**
 * Root Open Graph image (B2/U11) — generated via the `opengraph-image`
 * file convention so every route WITHOUT its own OG image inherits a
 * branded, truthful asset instead of nothing. Product pages override
 * it with their own cover image (see `producto/[slug]/page.tsx`).
 *
 * Brand tokens and image geometry remain code-owned. Copy refreshes with
 * Site Setting cache revalidation; a font-network failure degrades to the
 * ImageResponse default sans-serif without failing image generation.
 */

export const alt = FALLBACK_SHARE_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60;

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
      { signal: AbortSignal.timeout(8000) },
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
  const [fonts, settings] = await Promise.all([
    loadBrandFont(),
    getSiteSettings().catch(() => FALLBACK_SITE_SETTINGS),
  ]);
  const kicker = resolveSeoText(settings.seoShareImageKicker) ?? FALLBACK_SHARE_IMAGE_KICKER;
  const title = resolveSeoText(settings.seoShareImageTitle) ?? FALLBACK_SHARE_IMAGE_TITLE;
  const description =
    resolveSeoText(settings.seoShareImageDescription) ?? FALLBACK_SHARE_IMAGE_DESCRIPTION;
  const footer = resolveSeoText(settings.seoShareImageFooter) ?? FALLBACK_SHARE_IMAGE_FOOTER;
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
            {kicker}
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
          {title}
        </div>

        {/* Subline — verified service facts, no invented claims. */}
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: "#656565",
          }}
        >
          {description}
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
          <span>{footer}</span>
          <span>Chile</span>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    },
  );
}
