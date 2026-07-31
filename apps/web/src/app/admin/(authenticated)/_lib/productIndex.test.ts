import { describe, expect, it } from "vitest";
import { aggregateProductIndex, readStrapiProductPage } from "./productIndex";

describe("aggregateProductIndex", () => {
  it("aggregates multiple Strapi pages when the index exceeds 100 products", async () => {
    const calls: number[] = [];
    const products = await aggregateProductIndex(async (page) => {
      calls.push(page);
      const count = page < 3 ? 100 : 20;
      return {
        data: Array.from({ length: count }, (_, index) => `${page}-${index}`),
        meta: { pagination: { pageCount: 3 } },
      };
    });

    expect(calls).toEqual([1, 2, 3]);
    expect(products).toHaveLength(220);
  });

  it("never exceeds the bounded local index cap", async () => {
    const products = await aggregateProductIndex(
      async () => ({ data: Array.from({ length: 100 }, (_, index) => index) }),
      150,
    );

    expect(products).toHaveLength(150);
  });

  it("returns an empty index for malformed Strapi payloads", async () => {
    expect(
      await aggregateProductIndex(async () => ({ error: { message: "Unauthorized" } })),
    ).toEqual([]);
    expect(await aggregateProductIndex(async () => null)).toEqual([]);
  });

  it("returns an empty page for non-OK responses and missing data arrays", async () => {
    expect(
      await readStrapiProductPage({ ok: false, json: async () => ({ data: ["ignored"] }) }),
    ).toEqual({
      data: [],
    });
    expect(
      await readStrapiProductPage({ ok: true, json: async () => ({ data: "invalid" }) }),
    ).toEqual({
      data: [],
    });
  });
});
