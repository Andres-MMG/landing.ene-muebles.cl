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
  ContactCTA: ({ section }: { section?: { title?: string } }) => (
    <div data-testid="contact-cta">{section?.title}</div>
  ),
}));

vi.mock("@/components/ProductSubcategoryGroups", () => ({
  ProductSubcategoryGroups: ({
    products,
    actionCopy,
  }: {
    products: { id: number }[];
    actionCopy?: {
      detailLabel?: string;
      whatsappLabel?: string;
      whatsappMessageTemplate?: string;
    };
  }) => (
    <div
      data-testid="subcategory-groups"
      data-detail-label={actionCopy?.detailLabel}
      data-whatsapp-label={actionCopy?.whatsappLabel}
      data-whatsapp-template={actionCopy?.whatsappMessageTemplate}
    >
      {products.map(({ id }) => id).join(",")}
    </div>
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
const getCatalogPage = vi.fn();
const getContactCTASection = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getCategories,
  getProducts,
  getSiteSettings,
  getProductCount,
  getSubcategorySummaries,
  getCatalogPage,
  getContactCTASection,
}));

describe("CatalogoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategories.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue({ whatsappNumber: "+56912345678" });
    getProductCount.mockResolvedValue(20);
    getSubcategorySummaries.mockResolvedValue([]);
    getCatalogPage.mockResolvedValue({
      eyebrow: "Catálogo institucional",
      productCountSuffix: "productos certificados para instituciones.",
      documentationText: "Cada producto se entrega con ficha técnica y declaración de materiales.",
      printCtaLabel: "Imprimir PDF",
    });
    getContactCTASection.mockResolvedValue({ title: "CTA desde CMS" });
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
      await CatalogoPage({ searchParams: Promise.resolve({ page: "2" }) }),
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

  it("exposes only the browser print CTA and hides the technical JSON action", async () => {
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('href="/catalogo/imprimir"');
    expect(html).toContain("Imprimir PDF");
    expect(html).not.toContain('href="/api/catalog/export"');
    expect(html).not.toContain("Exportar datos JSON");
    expect(html).not.toContain("Imprimir / PDF");
  });

  it("uses the live count helper for the header when the paginated read is empty", async () => {
    getProducts.mockResolvedValue({ products: [], total: 0 });
    getProductCount.mockResolvedValue(7);
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("7 productos certificados para instituciones.");
    expect(getProductCount).toHaveBeenCalled();
  });

  it("falls back to static copy only when both reads return 0 (CMS unreachable)", async () => {
    getProducts.mockResolvedValue({ products: [], total: 0 });
    getProductCount.mockResolvedValue(0);
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("20 productos certificados para instituciones.");
  });

  it("renders the dispatch coverage from site settings", async () => {
    getSiteSettings.mockResolvedValue({
      whatsappNumber: "+56912345678",
      dispatchCoverage: "Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos",
    });
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain(
      "Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos y pago a 30, 60",
    );
  });

  it("renders CMS catalog copy while keeping counts derived and passes the CMS contact CTA", async () => {
    getCatalogPage.mockResolvedValue({
      eyebrow: "Etiqueta CMS",
      productCountSuffix: "productos gestionados.",
      documentationText: "Documentación CMS.",
      printCtaLabel: "Imprimir catálogo CMS",
    });
    getSiteSettings.mockResolvedValue({
      whatsappNumber: "+56912345678",
      dispatchCoverage: "Cobertura CMS",
      paymentTermsText: "Pago CMS.",
      productCardDetailLabel: "Ficha catálogo CMS",
      productCardWhatsappLabel: "Cotizar catálogo CMS",
      whatsappProductMessageTemplate: "Catálogo: {productName}.",
    });

    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("Etiqueta CMS");
    expect(html).toContain("13 productos gestionados.");
    expect(html).toContain("Cobertura CMS. Pago CMS. Documentación CMS.");
    expect(html).toContain("Imprimir catálogo CMS");
    expect(html).toContain("CTA desde CMS");
    expect(html).toContain('data-detail-label="Ficha catálogo CMS"');
    expect(html).toContain('data-whatsapp-label="Cotizar catálogo CMS"');
    expect(html).toContain('data-whatsapp-template="Catálogo: {productName}."');
    expect(getContactCTASection).toHaveBeenCalledOnce();
  });

  it("keeps the catalog available when the summary query fails", async () => {
    getSubcategorySummaries.mockRejectedValue(new Error("summary unavailable"));
    const { default: CatalogoPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('data-testid="subcategory-groups"');
    expect(html).toContain("13");
  });
});

describe("CatalogoPage metadata", () => {
  it("uses owner SEO fields and a query-independent code-owned canonical", async () => {
    getCatalogPage.mockResolvedValue({
      seoTitle: "Catálogo CMS",
      seoDescription: "Descripción catálogo CMS",
    });
    getSiteSettings.mockResolvedValue({ siteName: "Marca CMS", seoShareImageAlt: "Alt CMS" });
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Catálogo CMS · Marca CMS" });
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/catalogo" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://ene-muebles.cl/catalogo",
      description: "Descripción catálogo CMS",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      description: "Descripción catálogo CMS",
    });
  });
});
