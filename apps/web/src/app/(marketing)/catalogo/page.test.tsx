import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/CatalogSearch", () => ({
  CatalogSearch: ({ defaultValue }: { defaultValue?: string }) => (
    <div data-testid="catalog-search">{defaultValue}</div>
  ),
}));

vi.mock("@/components/CategoryFilter", () => ({
  CategoryFilter: () => <div data-testid="category-filter" />,
}));

vi.mock("@/components/ContactCTA", () => ({
  ContactCTA: () => <div data-testid="contact-cta" />,
}));

vi.mock("@/components/ProductSubcategoryGroups", () => ({
  ProductSubcategoryGroups: ({ products }: { products: { id: number }[] }) => (
    <div data-testid="subcategory-groups">{products.map(({ id }) => id).join(",")}</div>
  ),
}));

vi.mock("@/components/Pagination", () => ({
  Pagination: ({ page, total }: { page: number; total: number }) => (
    <nav aria-label="Paginación" data-testid="pagination">
      {page}/{total}
    </nav>
  ),
}));

const getCategories = vi.fn();
const getProducts = vi.fn();
const getSiteSettings = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getCategories,
  getProducts,
  getSiteSettings,
}));

describe("CatalogoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategories.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue({ whatsappNumber: "+56912345678" });
    getProducts.mockResolvedValue({
      products: [
        {
          id: 13,
          name: "Silla",
          slug: "silla",
          description: "Descripción",
          price: 1000,
          currency: "CLP",
          subcategory: "Sillas",
        },
      ],
      total: 13,
    });
  });

  it("renders the current product page through subcategory groups alongside pagination", async () => {
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CatalogoPage({ searchParams: Promise.resolve({ page: "2" }) })
    );

    expect(html).toContain('data-testid="subcategory-groups"');
    expect(html).toContain('data-testid="pagination"');
    expect(html).toContain("2/13");
    expect(getProducts).toHaveBeenCalledWith({ page: 2, pageSize: 12, q: undefined });
  });
});
