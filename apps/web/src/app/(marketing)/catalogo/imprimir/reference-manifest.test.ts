import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/strapi";
import {
  resolveReferencePlacement,
  type ReferenceManifest,
  type ReferenceSlot,
} from "./reference-manifest";

const product = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  description: "Current CMS description",
  price: 0,
  currency: "CLP",
  images: [],
  ...overrides,
});

const slotsFor = (sourcePage: number, template: "a" | "b", startId: number): ReferenceSlot[] =>
  Array.from({ length: 8 }, (_, index) => ({
    slug: `product-${startId + index}`,
    sourcePage,
    template,
    slot: (index + 1) as ReferenceSlot["slot"],
    imageIndex: 0,
  }));

const manifest = (slots: ReferenceSlot[]): ReferenceManifest => ({
  version: "test-reference-v1",
  visualEvidence: {
    status: "provided",
    cover: "Test cover",
    index: "Test index",
    categoryPage: "Test category page",
  },
  source: { status: "approved", assets: [] },
  slots,
});

describe("resolveReferencePlacement", () => {
  it("resolves CMS products into deterministic eight-slot A/B pages", () => {
    const slots = [...slotsFor(6, "a", 1), ...slotsFor(7, "b", 9)];
    const products = Array.from({ length: 16 }, (_, index) => product(index + 1));

    const result = resolveReferencePlacement({ products, truncated: false }, manifest(slots));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pages).toHaveLength(2);
    expect(result.pages.map((page) => page.template)).toEqual(["a", "b"]);
    expect(result.pages.map((page) => page.sourcePage)).toEqual([6, 7]);
    expect(result.pages.every((page) => page.products.length === 8)).toBe(true);
    expect(result.pages[0]?.products.map((entry) => entry.product.slug)).toEqual([
      "product-1",
      "product-2",
      "product-3",
      "product-4",
      "product-5",
      "product-6",
      "product-7",
      "product-8",
    ]);
    expect(result.pages[1]?.products[0]?.slot.imageIndex).toBe(0);
  });

  it("rejects pending references and truncated snapshots while permitting a final partial page", () => {
    const sevenSlots = slotsFor(6, "a", 1).slice(0, 7);
    const pending = { ...manifest(sevenSlots), source: { status: "pending" as const, assets: [] } };

    expect(resolveReferencePlacement({ products: [], truncated: false }, pending)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: "reference-pending" })]),
    });
    expect(
      resolveReferencePlacement(
        { products: Array.from({ length: 7 }, (_, index) => product(index + 1)), truncated: true },
        manifest(sevenSlots),
      ),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: "snapshot-truncated" })]),
    });

    const completePartialPage = resolveReferencePlacement(
      { products: Array.from({ length: 5 }, (_, index) => product(index + 1)), truncated: false },
      manifest(slotsFor(6, "a", 1).slice(0, 5)),
    );
    expect(completePartialPage).toMatchObject({ ok: true });
    if (completePartialPage.ok) {
      expect(completePartialPage.pages[0]?.products).toHaveLength(5);
    }
  });

  it("rejects missing, duplicate, stale, out-of-range, and unmapped placements", () => {
    const validSlots = slotsFor(6, "a", 1);
    const invalidSlots = [
      ...validSlots.slice(0, 6),
      { ...validSlots[6]!, slug: "missing-product" },
      { ...validSlots[7]!, slot: 9 as ReferenceSlot["slot"] },
      { ...validSlots[0]! },
    ];
    const products = [...Array.from({ length: 8 }, (_, index) => product(index + 1)), product(99)];

    const result = resolveReferencePlacement(
      { products, truncated: false },
      manifest(invalidSlots),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: "stale-slot" }),
        expect.objectContaining({ code: "duplicate-slot" }),
        expect.objectContaining({ code: "slot-out-of-range" }),
        expect.objectContaining({ code: "unmapped-product", slug: "product-99" }),
      ]),
    });
  });

  it("rejects catalog-page conflicts without replacing current CMS facts", () => {
    const products = Array.from({ length: 8 }, (_, index) =>
      product(index + 1, index === 0 ? { catalogPage: 99 } : {}),
    );

    expect(
      resolveReferencePlacement({ products, truncated: false }, manifest(slotsFor(6, "a", 1))),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: "catalog-page-mismatch", slug: "product-1" }),
      ]),
    });
  });
});
