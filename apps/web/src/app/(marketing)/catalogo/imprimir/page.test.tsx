import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCatalogSnapshot = vi.fn();
const getCatalogPage = vi.fn();
const getSiteSettings = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getCatalogSnapshot,
  getCatalogPage,
  getSiteSettings,
  pickMediaFormat: (
    media: { url: string; formats?: Record<string, { url: string }> },
    preferred: string,
  ) => media.formats?.[preferred]?.url ?? media.url,
}));

vi.mock("@/lib/product-attributes", () => ({
  formatDimensions: (product: { dimensions?: { width?: number } }) =>
    product.dimensions?.width ? "49 x 65 x 42 cm" : null,
}));

const product = (id: number, category = "Oficina", subcategory?: string) => ({
  id,
  name: `Producto ${id}`,
  slug: `producto-${id}`,
  description: `Descripción vigente del producto ${id}.`,
  price: 0,
  currency: "CLP",
  category: { id: 1, documentId: "c1", name: category, slug: category.toLowerCase() },
  subcategory,
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
    getCatalogPage.mockResolvedValue({
      eyebrow: "Catálogo institucional",
      productCountSuffix: "productos certificados para instituciones.",
      documentationText: "Cada producto se entrega con ficha técnica y declaración de materiales.",
      printCtaLabel: "Imprimir PDF",
      printCoverTitle: "Mobiliario institucional",
      printCoverBody:
        "Mobiliario para aulas, oficinas e instituciones. Información vigente al momento de la solicitud.",
      printIndexTitle: "Líneas de producto",
      printCategorySubtitle: "Mobiliario institucional",
      printPublishedProductsSuffix: "productos publicados",
    });
    getSiteSettings.mockResolvedValue({
      siteName: "ENE-MUEBLES",
      contactEmail: "contacto@ene-muebles.cl",
      contactPhone: "+56 9 9539 5339",
    });
  });

  it("renders fixed landscape cover, one index, category pages and print hooks from one snapshot", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(getCatalogSnapshot).toHaveBeenCalledOnce();
    expect(getCatalogPage).toHaveBeenCalledOnce();
    expect(getSiteSettings).toHaveBeenCalledOnce();
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
    expect(html).toContain('aria-label="ENE MUEBLES"');
    expect(html).toContain("ENE MUEBLES");
  });

  it("uses administrable print copy and site facts while keeping the product count derived", async () => {
    getCatalogPage.mockResolvedValue({
      eyebrow: "Catálogo CMS",
      productCountSuffix: "productos CMS.",
      documentationText: "Documentación CMS.",
      printCtaLabel: "Imprimir CMS",
      printCoverTitle: "Portada CMS",
      printCoverBody: "Texto de portada administrable.",
      printIndexTitle: "Índice administrable",
      printCategorySubtitle: "Subtítulo administrable",
      printPublishedProductsSuffix: "unidades publicadas",
    });
    getSiteSettings.mockResolvedValue({
      siteName: "Marca-CMS",
      contactEmail: "ventas@marca.test",
      contactPhone: "+56 (9) 1111-2222",
      address: "Calle Uno 123",
      addressCity: "Temuco",
      addressRegion: "La Araucanía",
      dispatchCoverage: "Cobertura nacional",
      quoteResponseTimeText: "Cotizamos en 24 h hábiles.",
      warrantyText: "Garantía escrita de 2 años.",
    });

    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("Portada CMS");
    expect(html).toContain("Texto de portada administrable.");
    expect(html).toContain("Índice administrable");
    expect(html).toContain("Subtítulo administrable");
    expect(html).toContain("Marca-CMS");
    expect(html).toContain('aria-label="Marca CMS"');
    expect(html).toContain('href="mailto:ventas@marca.test"');
    expect(html).toContain('href="tel:+56911112222"');
    expect(html).toContain("Calle Uno 123, Temuco, La Araucanía");
    expect(html).toContain("Cobertura nacional");
    expect(html).toContain("Cotizamos en 24 h hábiles.");
    expect(html).toContain("Garantía escrita de 2 años.");
    expect(html).toContain("3 unidades publicadas");
    expect(html).not.toContain("Líneas de producto");
  });

  it("keeps the current printable copy and contact facts when optional CMS reads fail", async () => {
    getCatalogPage.mockRejectedValue(new Error("catalog-page unavailable"));
    getSiteSettings.mockRejectedValue(new Error("site-setting unavailable"));

    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("Mobiliario institucional");
    expect(html).toContain(
      "Mobiliario para aulas, oficinas e instituciones. Información vigente al momento de la solicitud.",
    );
    expect(html).toContain("Líneas de producto");
    expect(html).toContain("ENE-MUEBLES");
    expect(html).toContain("ENE MUEBLES");
    expect(html).toContain("contacto@ene-muebles.cl");
    expect(html).toContain("+56 9 9539 5339");
    expect(html).toContain("Chile");
    expect(html).toContain("3 productos publicados");
    expect(html).not.toContain("Catálogo no disponible");
  });

  it("bounds longest valid configurable copy inside fixed print regions without losing product facts", async () => {
    const publishedSuffix = "P".repeat(120);
    getCatalogPage.mockResolvedValue({
      eyebrow: "E".repeat(120),
      productCountSuffix: "C".repeat(180),
      documentationText: "D".repeat(600),
      printCtaLabel: "L".repeat(80),
      printCoverTitle: "T".repeat(180),
      printCoverBody: "B".repeat(600),
      printIndexTitle: "I".repeat(180),
      printCategorySubtitle: "S".repeat(180),
      printPublishedProductsSuffix: publishedSuffix,
    });
    getSiteSettings.mockResolvedValue({
      siteName: "N".repeat(120),
      contactEmail: "e".repeat(60) + "@example.test",
      contactPhone: "+" + "56".repeat(100),
      address: "A".repeat(600),
      addressCity: "C".repeat(300),
      addressRegion: "R".repeat(300),
      dispatchCoverage: "D".repeat(1200),
      quoteResponseTimeText: "Q".repeat(280),
      warrantyText: "W".repeat(2000),
    });

    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain('class="print-cover-kicker print-bounded-single"');
    expect(html).toContain('class="print-cover-title print-bounded-lines print-lines-3"');
    expect(html).toContain('class="print-cover-copy print-bounded-lines print-lines-5"');
    expect(html).toContain('class="print-cover-address print-bounded-lines print-lines-2"');
    expect(html).toContain('class="print-index-title print-bounded-lines print-lines-2"');
    expect(html).toContain('class="print-category-subtitle print-bounded-lines print-lines-2"');
    expect(
      (html.match(/class="print-contact-fact print-bounded-lines print-lines-2"/g) ?? []).length,
    ).toBe(2);
    expect(html).toContain(
      ".print-bounded-single { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
    );
    expect(html).toContain("overflow-wrap: anywhere");
    expect(html).toContain("max-height: 42mm");
    expect(html).toContain("3 " + publishedSuffix);
    expect(html).toContain('data-product-slug="producto-3"');
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

  it("groups CMS products by category then optional subcategory without inventing missing names", async () => {
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: [
        product(1, "Oficina", "Escritorios"),
        product(2, "Oficina", "Mesas"),
        product(3, "Oficina"),
        product(4, "Escolar", "Sillas"),
      ],
    });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain('data-category-slug="oficina" data-subcategory="Escritorios"');
    expect(html).toContain('data-category-slug="oficina" data-subcategory="Mesas"');
    expect(html).toContain('data-category-slug="escolar" data-subcategory="Sillas"');
    expect(html).toContain("Subcategoría · Escritorios");
    expect(html).toContain("Oficina · Escritorios");
    expect(html).not.toContain("Subcategoría · Otros productos");
    expect(html).toMatch(/data-category-slug="oficina"[^>]*><header[\s\S]*?Producto 3/);
  });

  it("uses deterministic card regions with bounded text and the full category-header wordmark", async () => {
    getCatalogSnapshot.mockResolvedValue({
      fetchedAt: "2026-08-21T12:00:00.000Z",
      truncated: false,
      products: [
        {
          ...product(1, "Oficina", "Escritorios"),
          name: "Escritorio con un nombre suficientemente largo para dos líneas controladas",
          description: "Descripción extensa ".repeat(40),
        },
      ],
    });
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("grid-template-rows: 42mm minmax(0, 1fr)");
    expect(html).toContain("grid-template-rows: auto auto minmax(0, 1fr)");
    expect(html).toContain("-webkit-line-clamp: 2");
    expect(html).toContain("-webkit-line-clamp: 3");
    expect(html).toContain("print-category-brand");
    expect(html).toContain("Mobiliario institucional");
    expect(html).toContain("ENE MUEBLES");
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

describe("print utility metadata", () => {
  it("is noindex,follow and canonicalizes to the main catalog", async () => {
    const { metadata } = await import("./page");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/catalogo" });
  });
});
