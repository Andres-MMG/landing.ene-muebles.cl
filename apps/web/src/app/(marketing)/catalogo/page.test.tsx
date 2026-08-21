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
const getProductCount = vi.fn();
const getSubcategorySummaries = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getCategories,
  getProducts,
  getSiteSettings,
  getProductCount,
  getSubcategorySummaries,
}));

describe("CatalogoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategories.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue({ whatsappNumber: "+56912345678" });
    getProductCount.mockResolvedValue(20);
    getSubcategorySummaries.mockResolvedValue([]);
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
    expect(getProducts).toHaveBeenCalledWith({
      page: 2,
      pageSize: 12,
      q: undefined,
      subcategory: undefined,
    });
  });

  it("promotes the print catalog as the primary export CTA and keeps JSON as secondary", async () => {
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CatalogoPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain('href="/catalogo/imprimir"');
    expect(html).toContain("Imprimir / PDF");
    // The JSON export stays reachable as the secondary technical link.
    expect(html).toContain('href="/api/catalog/export"');
    expect(html).toContain("Exportar datos JSON");
    expect(html).not.toContain("Descargar catálogo JSON");
  });

  it("uses the live count helper for the header when the paginated read is empty", async () => {
    getProducts.mockResolvedValue({ products: [], total: 0 });
    getProductCount.mockResolvedValue(7);
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CatalogoPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("7 productos certificados para instituciones.");
    expect(getProductCount).toHaveBeenCalled();
  });

  it("falls back to static copy only when both reads return 0 (CMS unreachable)", async () => {
    getProducts.mockResolvedValue({ products: [], total: 0 });
    getProductCount.mockResolvedValue(0);
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CatalogoPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("20 productos certificados para instituciones.");
  });

  it("renders the dispatch coverage from site settings", async () => {
    getSiteSettings.mockResolvedValue({
      whatsappNumber: "+56912345678",
      dispatchCoverage: "Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos",
    });
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CatalogoPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain(
      "Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos y pago a 30, 60",
    );
  });

  it("keeps the catalog available when the summary query fails", async () => {
    getSubcategorySummaries.mockRejectedValue(new Error("summary unavailable"));
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CatalogoPage({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain('data-testid="subcategory-groups"');
    expect(html).toContain("13");
  });
});
