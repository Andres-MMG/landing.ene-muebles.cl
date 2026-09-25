import { describe, expect, it } from "vitest";
import { absoluteSiteUrl, DEFAULT_SITE_ORIGIN, resolveSiteOrigin } from "./site-origin";

describe("resolveSiteOrigin", () => {
  it("uses the tracked production origin for missing or blank values", () => {
    expect(resolveSiteOrigin(undefined)).toBe(DEFAULT_SITE_ORIGIN);
    expect(resolveSiteOrigin("   ")).toBe(DEFAULT_SITE_ORIGIN);
  });

  it("normalizes valid HTTP and HTTPS origins, including explicit local development", () => {
    expect(resolveSiteOrigin("https://www.ene-muebles.cl/")).toBe("https://www.ene-muebles.cl");
    expect(resolveSiteOrigin("http://localhost:4780/")).toBe("http://localhost:4780");
  });

  it.each([
    "ftp://ene-muebles.cl",
    "https://user:secret@ene-muebles.cl",
    "https://ene-muebles.cl/catalogo",
    "https://ene-muebles.cl/?page=2",
    "https://ene-muebles.cl/#catalogo",
    "not a url",
  ])("rejects unsafe or non-origin value %s", (value: string) => {
    expect(resolveSiteOrigin(value)).toBe(DEFAULT_SITE_ORIGIN);
  });
});

describe("absoluteSiteUrl", () => {
  it("builds root and path URLs without duplicate slashes", () => {
    expect(absoluteSiteUrl("/", "https://example.test")).toBe("https://example.test");
    expect(absoluteSiteUrl("catalogo", "https://example.test")).toBe(
      "https://example.test/catalogo",
    );
  });
});
