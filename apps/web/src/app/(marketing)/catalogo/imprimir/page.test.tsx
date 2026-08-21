import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCatalogSnapshot = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getCatalogSnapshot,
  formatPrice: (product: { price: number; currency: string }) => `$${product.price}`,
  hasVerifiedOffer: (product: { price: number; currency: string }) => product.price > 0 && product.currency === "CLP",
  pickMediaFormat: (media: { url: string; formats?: Record<string, { url: string }> }, preferred: string) =>
    media.formats?.[preferred]?.url ?? media.url,
}));

vi.mock("@/lib/product-attributes", () => ({
  formatDimensions: (product: { dimensions?: { width?: number; source?: string } }) =>
    product.dimensions?.width ? "49 x 65 x 42 cm" : product.dimensions?.source ? "60 x 40 x 40 cm" : null,
  hasVerifiedOffer: (product: { price: number; currency: string }) => product.price > 0 && product.currency === "CLP",
}));

describe("CatalogoImprimirPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: [
        {
          id: 1,
          name: "Escritorio institucional",
          slug: "escritorio",
          description: "Especificación vigente del escritorio institucional.",
          price: 1000,
          currency: "CLP",
          category: { id: 1, documentId: "c1", name: "Oficina", slug: "oficina" },
          dimensions: { width: 49, height: 65, depth: 42 },
          materials: ["Melamina 18 mm"],
          images: [{ id: 10, url: "https://cms.test/desk.jpg", alternativeText: "Escritorio", formats: { medium: { url: "https://cms.test/desk-medium.jpg" } } }],
        },
        {
          id: 2,
          name: "Silla apilable",
          slug: "silla",
          description: "Silla para uso institucional.",
          price: 0,
          currency: "CLP",
          category: { id: 2, documentId: "c2", name: "Escolar", slug: "escolar" },
          dimensions: { source: "60cm x 40cm x 40cm" },
          materials: ["Polipropileno"],
          images: [],
        },
        {
          id: 3,
          name: "Sin categoría",
          slug: "sin-categoria",
          description: "Producto sin categoría asignada.",
          price: 1000,
          currency: "USD",
          category: null,
          images: [],
        },
      ],
    });
  });

  it("renders a branded cover, index counts, ordered sections, current cards and print hooks", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(getCatalogSnapshot).toHaveBeenCalledOnce();
    expect(html).toContain("print-cover");
    expect(html).toContain("ENE-MUEBLES");
    expect(html).toContain("print-index");
    expect(html).toContain("Oficina");
    expect(html).toContain("Escolar");
    expect(html).toContain("Catálogo general");
    expect(html).toContain("3 productos");
    expect(html).toContain("Especificación vigente del escritorio institucional.");
    expect(html).toContain("desk-medium.jpg");
    expect(html).toContain("Medidas");
    expect(html).toContain("Melamina 18 mm");
    expect(html).toContain("Sin imagen: Silla apilable");
    expect(html).toContain("$1000");
    expect(html).not.toContain("$0");
    expect(html).toContain("page-number");
    expect(html).toContain('data-page-number="true"');
    expect(html).toContain("A4 portrait");
    expect(html).toContain("body:has(.print-document)");
    expect(html).toContain('aria-labelledby="print-index-title"');
    expect(html).toContain("La paginación puede variar entre navegadores.");
  });

  it("shows truthful empty and truncation states", async () => {
    getCatalogSnapshot.mockResolvedValue({ fetchedAt: "2026-08-21T12:00:00.000Z", truncated: false, products: [] });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("El catálogo aún no tiene productos publicados.");
    expect(html).toContain("No hay productos disponibles para imprimir.");
    expect(html).not.toContain("Se muestran los primeros");

    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: true,
      products: [{ id: 1, name: "Producto acotado", slug: "producto-acotado", description: "", price: 0, currency: "CLP", category: null, images: [] }],
    });
    const truncatedHtml = renderToStaticMarkup(await CatalogoImprimirPage());
    expect(truncatedHtml).toContain("Se muestran los primeros 1 productos disponibles.");
  });

  it("renders a stable error state when the snapshot fails", async () => {
    getCatalogSnapshot.mockRejectedValue(new Error("CMS unavailable"));
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("Catálogo no disponible");
    expect(html).toContain("No pudimos cargar el catálogo en este momento.");
    expect(html).not.toContain("CMS unavailable");
    expect(html).toContain("print-document");
  });

  it("renders changed CMS product values on a later request instead of stale content", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");

    getCatalogSnapshot.mockResolvedValueOnce({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: [{ id: 9, name: "Silla anterior", slug: "silla", description: "Descripción anterior", price: 0, currency: "CLP", category: null, images: [] }],
    });
    const firstHtml = renderToStaticMarkup(await CatalogoImprimirPage());
    expect(firstHtml).toContain("Silla anterior");

    getCatalogSnapshot.mockResolvedValueOnce({
      fetchedAt: "2026-08-21T12:01:00.000Z",
      truncated: false,
      products: [{ id: 9, name: "Silla actualizada", slug: "silla", description: "Especificación actual", price: 0, currency: "CLP", category: null, images: [] }],
    });
    const currentHtml = renderToStaticMarkup(await CatalogoImprimirPage());
    expect(currentHtml).toContain("Silla actualizada");
    expect(currentHtml).toContain("Especificación actual");
    expect(currentHtml).not.toContain("Silla anterior");
  });

  it("keeps image alternatives and index targets accessible", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain('alt="Escritorio"');
    expect(html).toContain('href="#categoria-oficina"');
    expect(html).toContain('id="categoria-oficina"');
    expect(html).toContain('aria-labelledby="titulo-oficina"');
    expect(html).toContain('role="img"');
  });
});
