import { describe, expect, it } from "vitest";

import {
  GENERAL_PRODUCT_LABEL,
  SUPPORTED_REGIONS,
  isSupportedRegion,
  normalizeProductContext,
} from "./lead-policy";

describe("lead policy", () => {
  it("contains exactly the nine supported Chilean regions", () => {
    expect(SUPPORTED_REGIONS).toEqual([
      "Valparaíso",
      "Metropolitana",
      "O'Higgins",
      "Maule",
      "Ñuble",
      "Biobío",
      "La Araucanía",
      "Los Ríos",
      "Los Lagos",
    ]);
  });

  it("accepts only exact supported region values", () => {
    expect(isSupportedRegion("Metropolitana")).toBe(true);
    expect(isSupportedRegion(" Metropolitana ")).toBe(false);
    expect(isSupportedRegion("Santiago")).toBe(false);
    expect(isSupportedRegion(undefined)).toBe(false);
  });

  it("normalizes valid slug context and maps general or malformed values to null", () => {
    expect(normalizeProductContext("  silla-nordica ")).toBe("silla-nordica");
    expect(normalizeProductContext(GENERAL_PRODUCT_LABEL)).toBeNull();
    expect(normalizeProductContext("<tampered-label>")).toBeNull();
    expect(normalizeProductContext(null)).toBeNull();
  });
});
