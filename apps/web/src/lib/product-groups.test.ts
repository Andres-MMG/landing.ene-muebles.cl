import { describe, expect, it } from "vitest";
import { groupProductsBySubcategory, hasSubcategoryData } from "./product-groups";
import type { Product } from "./strapi";

const product = (id: number, subcategory?: string): Product => ({
  id,
  name: `Producto ${id}`,
  slug: `producto-${id}`,
  description: "Descripción",
  price: 1000,
  currency: "CLP",
  subcategory,
});

describe("groupProductsBySubcategory", () => {
  it("groups trimmed subcategories case-insensitively in first-seen order", () => {
    const groups = groupProductsBySubcategory([
      product(1, " Sillas "),
      product(2, "Mesas"),
      product(3, "sillas"),
    ]);

    expect(groups.map(({ name, products }) => [name, products.map(({ id }) => id)])).toEqual([
      ["Sillas", [1, 3]],
      ["Mesas", [2]],
    ]);
  });

  it("keeps products without a supported subcategory visible", () => {
    const groups = groupProductsBySubcategory([product(1), product(2, "Sillas")]);

    expect(groups[0]).toMatchObject({ name: "Otros productos", products: [product(1)] });
    expect(hasSubcategoryData(groups)).toBe(true);
  });

  it("does not enable grouping navigation when no product has a subcategory", () => {
    const groups = groupProductsBySubcategory([product(1), product(2, " ")]);

    expect(groups).toHaveLength(1);
    expect(hasSubcategoryData(groups)).toBe(false);
  });
});
