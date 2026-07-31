import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_LIST_VIEW,
  filterAndSortProductIndex,
  normalizeProductSearch,
  parseProductListView,
  productListReturnTarget,
  serializeProductListView,
} from "./productListState";

const products = [
  {
    documentId: "1",
    name: "Silla Álamo",
    externalId: "EX-20",
    publishedAt: "2026-01-01",
    category: { documentId: "chairs", name: "Sillas" },
    subcategory: "Escolar",
    importSource: "imported" as const,
    hasImage: true,
  },
  {
    documentId: "2",
    name: "Mesa escolar",
    externalId: "EX-3",
    publishedAt: null,
    category: { documentId: "tables", name: "Mesas" },
    subcategory: "Aulas",
    importSource: "manual" as const,
    hasImage: false,
  },
  {
    documentId: "3",
    name: "Archivador legado",
    externalId: "EX-10",
    publishedAt: null,
    category: { documentId: "storage", name: "Archivadores" },
    hasImage: false,
  },
];

describe("product list state", () => {
  it("normalizes accents and case for client-side search", () => {
    expect(normalizeProductSearch("  ÁLAMO  ")).toBe("alamo");
    expect(
      filterAndSortProductIndex(products, { ...DEFAULT_PRODUCT_LIST_VIEW, query: "alamo sillas" }),
    ).toHaveLength(1);
  });

  it("combines filters and sorts external IDs naturally by default", () => {
    expect(
      filterAndSortProductIndex(products, {
        ...DEFAULT_PRODUCT_LIST_VIEW,
        status: "draft",
        image: "missing",
        source: "manual",
      }).map((product) => product.documentId),
    ).toEqual(["2", "3"]);
    expect(
      filterAndSortProductIndex(products, DEFAULT_PRODUCT_LIST_VIEW).map(
        (product) => product.externalId,
      ),
    ).toEqual(["EX-3", "EX-10", "EX-20"]);
  });

  it("treats products without provenance as manual", () => {
    expect(
      filterAndSortProductIndex(products, {
        ...DEFAULT_PRODUCT_LIST_VIEW,
        source: "manual",
      }).map((product) => product.documentId),
    ).toEqual(["2", "3"]);
  });

  it("serializes shareable state without scroll position", () => {
    const state = {
      ...DEFAULT_PRODUCT_LIST_VIEW,
      query: "mesa",
      categoryId: "tables",
      source: "manual" as const,
      sort: "name" as const,
      direction: "desc" as const,
    };
    expect(parseProductListView(new URLSearchParams(serializeProductListView(state)))).toEqual(
      state,
    );
    expect(serializeProductListView(state)).not.toContain("scroll");
    expect(parseProductListView(new URLSearchParams("q=mesa&scroll=412"))).toEqual({
      ...DEFAULT_PRODUCT_LIST_VIEW,
      query: "mesa",
    });
  });

  it("accepts only local product-list return targets", () => {
    expect(productListReturnTarget("/admin/productos?q=mesa")).toBe("/admin/productos?q=mesa");
    expect(productListReturnTarget("https://example.com")).toBe("/admin/productos");
    expect(productListReturnTarget("//example.com")).toBe("/admin/productos");
  });
});
