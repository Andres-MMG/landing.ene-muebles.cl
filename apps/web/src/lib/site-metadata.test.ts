import { describe, expect, it } from "vitest";
import { siteMetadata } from "./site-metadata";

/**
 * Root Open Graph + Twitter contract (B2/U11). The seo-geo-aeo spec
 * requires the indexable route to expose consistent OG/Twitter
 * metadata from approved sources; this suite guards the root defaults
 * that every page inherits.
 */

describe("siteMetadata — root Open Graph + Twitter (B2/U11)", () => {
  it("exposes an absolute, resolvable metadataBase", () => {
    expect(siteMetadata.metadataBase).toBeInstanceOf(URL);
    expect(siteMetadata.metadataBase.protocol).toMatch(/^https?:$/);
    expect(siteMetadata.metadataBase.hostname.length).toBeGreaterThan(0);
  });

  it("openGraph carries the brand title and a non-generic Spanish description", () => {
    expect(siteMetadata.openGraph.type).toBe("website");
    expect(siteMetadata.openGraph.locale).toBe("es_CL");
    expect(siteMetadata.openGraph.siteName).toBe("ENE-MUEBLES");
    expect(siteMetadata.openGraph.title).toContain("Mobiliario");
    expect(siteMetadata.openGraph.description.length).toBeGreaterThan(40);
  });

  it("openGraph images reference the file-convention asset and resolve absolutely", () => {
    const image = siteMetadata.openGraph.images[0];
    expect(image.url).toBe("/opengraph-image");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.alt).toContain("ENE Muebles");
    // metadataBase resolution — crawlers must receive an absolute URL.
    const absolute = new URL(image.url, siteMetadata.metadataBase).toString();
    expect(absolute.startsWith(siteMetadata.metadataBase.origin)).toBe(true);
  });

  it("twitter mirrors Open Graph with a summary_large_image card", () => {
    expect(siteMetadata.twitter.card).toBe("summary_large_image");
    expect(siteMetadata.twitter.title).toBe(siteMetadata.openGraph.title);
    expect(siteMetadata.twitter.description).toBe(siteMetadata.openGraph.description);
    expect(siteMetadata.twitter.images[0]).toBe(siteMetadata.openGraph.images[0].url);
  });
});
