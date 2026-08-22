import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCatalogSnapshot = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getCatalogSnapshot,
  pickMediaFormat: (
    media: { url: string; formats?: Record<string, { url: string }> },
    preferred: string,
  ) => media.formats?.[preferred]?.url ?? media.url,
}));

vi.mock("@/lib/product-attributes", () => ({
  formatDimensions: (product: { dimensions?: { width?: number } }) =>
    product.dimensions?.width ? "49 x 65 x 42 cm" : null,
}));

const product = (id: number, category = "Oficina") => ({
  id,
  name: `Producto ${id}`,
  slug: `producto-${id}`,
  description: `Descripción vigente del producto ${id}.`,
  price: 0,
  currency: "CLP",
  category: { id: 1, documentId: "c1", name: category, slug: category.toLowerCase() },
  dimensions: id === 1 ? { width: 49 } : undefined,
  materials: id === 1 ? ["Melamina 18 mm"] : undefined,
  images:
    id === 2
      ? []
      : [
          {
            id,
            url: `https://cms.test/${id}.jpg`,
            alternativeText: `Imagen ${id}`,
            formats: { large: { url: `https://cms.test/${id}-large.jpg` } },
          },
        ],
});

describe("CatalogoImprimirPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: [product(1), product(2), product(3, "Escolar")],
    });
  });

  it("renders fixed landscape cover, one index, category pages and print hooks from one snapshot", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(getCatalogSnapshot).toHaveBeenCalledOnce();
    expect(html).toContain('data-page-family="cover"');
    expect(html).toContain('data-page-family="index"');
    expect(html).toContain('data-page-family="category"');
    expect(html).toContain("linear-gradient(90deg");
    expect(html).toContain("A4 landscape");
    expect(html).toContain("297mm");
    expect(html).toContain("210mm");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("repeat(4, minmax(0, 1fr))");
    expect(html).toContain('href="#categoria-oficina"');
    expect(html).toContain("print-contact-panel");
    expect(html).toContain('data-page-number="true"');
    expect(html).toContain('<div class="print-catalog print-document"');
    expect(html).not.toContain("<main");
  });

  it("uses current CMS facts, large media, accessible fallbacks, and partial-page blank space", async () => {
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: Array.from({ length: 9 }, (_, index) => product(index + 1)),
    });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("Producto 9");
    expect(html).toContain("Descripción vigente del producto 1.");
    expect(html).toContain("1-large.jpg");
    expect(html).toContain('alt="Imagen 1"');
    expect(html).toContain("Sin imagen: Producto 2");
    expect(html).toContain("grid-template-rows: repeat(2, minmax(0, 1fr))");
    expect((html.match(/data-product-slug=/g) ?? []).length).toBe(9);
  });

  it("renders truthful empty, truncated, and error states", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: [],
    });
    expect(renderToStaticMarkup(await CatalogoImprimirPage())).toContain(
      "No hay productos disponibles para imprimir.",
    );

    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: true,
      products: [product(1)],
    });
    expect(renderToStaticMarkup(await CatalogoImprimirPage())).toContain(
      "Se muestran los primeros 1 productos disponibles.",
    );

    getCatalogSnapshot.mockRejectedValue(new Error("CMS unavailable"));
    const errorHtml = renderToStaticMarkup(await CatalogoImprimirPage());
    expect(errorHtml).toContain("Catálogo no disponible");
    expect(errorHtml).not.toContain("CMS unavailable");
  });

  it("keeps a truncation notice inside the first defined index print unit", async () => {
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: true,
      products: Array.from({ length: 9 }, (_, index) => product(index + 1)),
    });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toMatch(/data-page-family="index"[\s\S]*data-catalog-truncated="true"/);
    expect(html).not.toMatch(/<\/section><p class="print-truncated"/);
    expect((html.match(/data-page-family="category"/g) ?? []).length).toBe(2);
  });

  it("bounds the truncation notice away from the index contact panel", async () => {
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: true,
      products: [product(1)],
    });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect((html.match(/\.print-truncated\s*\{/g) ?? []).length).toBe(1);
    expect(html).toContain(
      ".print-truncated { position: absolute; bottom: 18mm; left: 18mm; width: 91mm;",
    );
    expect(html).toContain(
      ".print-contact-panel { position: absolute; right: 18mm; bottom: 18mm; width: 91mm;",
    );
  });

  it("paginates category index entries without clipping any category", async () => {
    const categories = Array.from({ length: 19 }, (_, index) => `Categoría ${index + 1}`);
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: categories.map((category, index) => product(index + 1, category)),
    });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect((html.match(/data-page-family="index"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-index-page="1/2"');
    expect(html).toContain('data-index-page="2/2"');
    expect(html).toContain('aria-labelledby="print-index-title-1"');
    expect(html).toContain('aria-labelledby="print-index-title-2"');
    expect((html.match(/id="print-index-title-1"/g) ?? []).length).toBe(1);
    expect((html.match(/id="print-index-title-2"/g) ?? []).length).toBe(1);
    expect((html.match(/id="print-index-title-\d+"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('id="print-index-title"');
    for (const category of categories) {
      expect(html).toContain(category);
    }
  });
});
