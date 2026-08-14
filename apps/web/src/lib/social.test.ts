import { describe, it, expect } from "vitest";
import { isSocialNetwork, socialHref } from "./social";

describe("socialHref", () => {
  it("builds the canonical URL from a bare handle", () => {
    expect(socialHref("instagram", "enemuebles")).toBe(
      "https://instagram.com/enemuebles",
    );
    expect(socialHref("facebook", "enemuebles.cl")).toBe(
      "https://facebook.com/enemuebles.cl",
    );
  });

  it("strips the leading @ shorthand", () => {
    expect(socialHref("instagram", "@enemuebles")).toBe(
      "https://instagram.com/enemuebles",
    );
  });

  it("keeps the tiktok @ in the canonical profile path", () => {
    expect(socialHref("tiktok", "enemuebles")).toBe(
      "https://tiktok.com/@enemuebles",
    );
  });

  it("keeps the linkedin /in/ profile path", () => {
    expect(socialHref("linkedin", "ene-muebles")).toBe(
      "https://linkedin.com/in/ene-muebles",
    );
  });

  it("uses a full URL as-is when its host matches the network", () => {
    expect(socialHref("instagram", "https://instagram.com/enemuebles")).toBe(
      "https://instagram.com/enemuebles",
    );
  });

  it("accepts www subdomains of the expected host", () => {
    expect(
      socialHref("instagram", "https://www.instagram.com/enemuebles"),
    ).toBe("https://www.instagram.com/enemuebles");
  });

  it("rejects a full URL whose host belongs to a different network", () => {
    expect(
      socialHref("facebook", "https://www.instagram.com/enemuebles"),
    ).toBeNull();
  });

  it("rejects lookalike hosts that merely end with the network domain", () => {
    expect(socialHref("instagram", "https://notinstagram.com/x")).toBeNull();
  });

  it("returns null for empty, whitespace, and missing values", () => {
    expect(socialHref("instagram", "")).toBeNull();
    expect(socialHref("instagram", "   ")).toBeNull();
    expect(socialHref("instagram", null)).toBeNull();
    expect(socialHref("instagram", undefined)).toBeNull();
  });

  it("returns null for values that cannot be plain handles", () => {
    expect(socialHref("instagram", "@")).toBeNull();
    expect(socialHref("instagram", "javascript:alert(1)")).toBeNull();
    expect(socialHref("instagram", "ene muebles")).toBeNull();
    expect(socialHref("instagram", "ene/muebles")).toBeNull();
    expect(socialHref("instagram", "ene#muebles")).toBeNull();
    expect(socialHref("instagram", 'ene"muebles')).toBeNull();
  });

  it("never emits '#' or arbitrary schemes", () => {
    expect(socialHref("instagram", "")).not.toBe("#");
    expect(socialHref("instagram", "ftp://files.example/x")).toBeNull();
    expect(socialHref("facebook", "http://facebook.com/ene")).toBeNull();
  });

  it("rejects plain-http full URLs", () => {
    expect(socialHref("facebook", "http://facebook.com/ene")).toBeNull();
    expect(socialHref("instagram", "http://instagram.com/enemuebles")).toBeNull();
  });
});

describe("isSocialNetwork", () => {
  it("recognizes the supported networks", () => {
    for (const network of ["instagram", "facebook", "tiktok", "linkedin"]) {
      expect(isSocialNetwork(network)).toBe(true);
    }
  });

  it("rejects unknown keys (e.g. future Strapi component keys)", () => {
    expect(isSocialNetwork("youtube")).toBe(false);
    expect(isSocialNetwork("twitter")).toBe(false);
  });
});
