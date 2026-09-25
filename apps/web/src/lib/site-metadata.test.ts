import { describe, expect, it } from "vitest";
import type { Metadata } from "next";
import { siteMetadata } from "./site-metadata";
import { FALLBACK_ROOT_DESCRIPTION, FALLBACK_ROOT_SOCIAL_DESCRIPTION } from "./seo-metadata";

const metadataBase = siteMetadata.metadataBase as URL;
const openGraph = siteMetadata.openGraph as NonNullable<Metadata["openGraph"]> & {
  type: "website";
};
const openGraphImages = openGraph.images as Array<{
  url: string | URL;
  width?: number;
  height?: number;
  alt?: string;
}>;
const twitter = siteMetadata.twitter as NonNullable<Metadata["twitter"]> & {
  card: "summary_large_image";
};
const twitterImages = twitter.images as Array<string | URL>;

/**
 * Root Open Graph + Twitter contract (B2/U11). The seo-geo-aeo spec
 * requires the indexable route to expose consistent OG/Twitter
 * metadata from approved sources; this suite guards the root defaults
 * that every page inherits.
 */

describe("siteMetadata — root Open Graph + Twitter (B2/U11)", () => {
  it("exposes an absolute, resolvable metadataBase", () => {
    expect(siteMetadata.metadataBase).toBeInstanceOf(URL);
    expect(metadataBase.protocol).toMatch(/^https?:$/);
    expect(metadataBase.hostname.length).toBeGreaterThan(0);
  });

  it("openGraph carries the brand title and a non-generic Spanish description", () => {
    expect(openGraph.type).toBe("website");
    expect(openGraph.locale).toBe("es_CL");
    expect(openGraph.siteName).toBe("ENE-MUEBLES");
    expect(openGraph.title).toContain("Mobiliario");
    expect(siteMetadata.description).toBe(FALLBACK_ROOT_DESCRIPTION);
    expect(openGraph.description).toBe(FALLBACK_ROOT_SOCIAL_DESCRIPTION);
  });

  it("openGraph images reference the file-convention asset and resolve absolutely", () => {
    const image = openGraphImages[0];
    expect(image.url).toBe("https://ene-muebles.cl/opengraph-image");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.alt).toContain("ENE Muebles");
    // metadataBase resolution — crawlers must receive an absolute URL.
    const absolute = new URL(image.url, metadataBase).toString();
    expect(absolute.startsWith(metadataBase.origin)).toBe(true);
  });

  it("twitter mirrors Open Graph with a summary_large_image card", () => {
    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.title).toBe(openGraph.title);
    expect(twitter.description).toBe(openGraph.description);
    expect(twitterImages[0]).toBe(openGraphImages[0].url);
  });
});
