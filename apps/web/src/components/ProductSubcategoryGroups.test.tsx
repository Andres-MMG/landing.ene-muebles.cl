import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProductSubcategoryGroups } from "./ProductSubcategoryGroups";
import { focusSubcategoryTarget } from "./SubcategoryNavigation";
import type { Product } from "@/lib/strapi";

const product = (id: number, subcategory?: string): Product => ({
  id,
  name: `Producto ${id}`,
  slug: `producto-${id}`,
  description: "Descripción",
  price: 1000,
  currency: "CLP",
  subcategory,
});

describe("ProductSubcategoryGroups", () => {
  it("moves keyboard focus to the matching fragment target", () => {
    const focus = vi.fn();
    const getElementById = vi.fn().mockReturnValue({ focus });
    vi.stubGlobal("document", { getElementById });

    focusSubcategoryTarget("subcategory-sillas-1");

    expect(getElementById).toHaveBeenCalledWith("subcategory-sillas-1");
    expect(focus).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("renders landmark navigation and focusable group sections for populated subcategories", () => {
    const html = renderToStaticMarkup(
      <ProductSubcategoryGroups products={[product(1, "Sillas"), product(2, "Mesas")]} />
    );

    expect(html).toContain('<nav aria-label="Subcategorías del catálogo"');
    expect(html).toContain('href="#subcategory-sillas-1"');
    expect(html).toContain('href="#subcategory-mesas-2"');
    expect(html).toContain('id="subcategory-sillas-1" tabindex="-1"');
    expect(html).toContain('aria-labelledby="subcategory-sillas-1-heading"');
    expect(html).toContain('<h2 id="subcategory-sillas-1-heading"');
  });

  it("renders complete subcategory summaries as catalog filters", () => {
    const html = renderToStaticMarkup(
      <ProductSubcategoryGroups
        products={[product(1, "Sillas")]}
        subcategorySummaries={[
          { subcategory: "Sillas", count: 5 },
          { subcategory: "Mesas", count: 6 },
        ]}
        q="madera"
      />,
    );

    expect(html).toContain('href="/catalogo?subcategory=Mesas&amp;q=madera"');
    expect(html).toContain(">6</span>");
  });

  it("keeps uncategorized products in the visible fallback group", () => {
    const html = renderToStaticMarkup(
      <ProductSubcategoryGroups products={[product(1, "Sillas"), product(2)]} />
    );

    expect(html).toContain("Otros productos");
    expect(html).toContain("Producto 2");
  });

  it("uses the existing flat product list when there is no subcategory data", () => {
    const html = renderToStaticMarkup(
      <ProductSubcategoryGroups products={[product(1), product(2, " ")]} />
    );

    expect(html).not.toContain("Subcategorías del catálogo");
    expect(html).toContain("Producto 1");
    expect(html).toContain("Producto 2");
  });
});
