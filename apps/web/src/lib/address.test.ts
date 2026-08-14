import { describe, it, expect } from "vitest";
import { buildAddressParts, formatAddress } from "./address";

describe("buildAddressParts", () => {
  it("returns the street alone when city and region are empty", () => {
    expect(buildAddressParts({ address: "Cautín 1782" })).toEqual({ street: "Cautín 1782" });
  });

  it("drops blank and whitespace-only values", () => {
    expect(
      buildAddressParts({ address: "  Cautín 1782 ", addressCity: "  ", addressRegion: null })
    ).toEqual({ street: "Cautín 1782" });
  });

  it("keeps city and region when set", () => {
    expect(
      buildAddressParts({ address: "Cautín 1782", addressCity: "Temuco", addressRegion: "Araucanía" })
    ).toEqual({ street: "Cautín 1782", city: "Temuco", region: "Araucanía" });
  });

  it("returns an empty object when nothing is configured", () => {
    expect(buildAddressParts({})).toEqual({});
    expect(buildAddressParts({ address: null })).toEqual({});
  });
});

describe("formatAddress", () => {
  it("renders the bare street when no city is confirmed", () => {
    expect(formatAddress({ address: "Cautín 1782" })).toBe("Cautín 1782");
  });

  it("appends the city only when set", () => {
    expect(formatAddress({ address: "Cautín 1782", addressCity: "Temuco" })).toBe(
      "Cautín 1782, Temuco"
    );
  });

  it("appends city and region in order", () => {
    expect(
      formatAddress({
        address: "Cautín 1782",
        addressCity: "Temuco",
        addressRegion: "Araucanía",
      })
    ).toBe("Cautín 1782, Temuco, Araucanía");
  });

  it("renders region without city when only the region is set", () => {
    expect(formatAddress({ address: "Cautín 1782", addressRegion: "Araucanía" })).toBe(
      "Cautín 1782, Araucanía"
    );
  });

  it("returns null when there is no street", () => {
    expect(formatAddress({})).toBeNull();
    expect(formatAddress({ addressCity: "Temuco" })).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(formatAddress({ address: "  Cautín 1782  " })).toBe("Cautín 1782");
  });
});
