import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAllProducts = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getAllProducts,
}));

vi.mock("@/lib/product-attributes", () => ({
  formatDimensions: (p: { dimensions?: { source?: string; width?: number; height?: number; depth?: number } }) =>
    p.dimensions?.width ? "49 x 65 x 42 cm" : p.dimensions?.source ? "60 x 40 x 40 cm" : null,
}));

describe("CatalogoImprimirPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllProducts.mockResolvedValue([
      {
        id: 1,
        name: "Escritorio institucional",
        slug: "escritorio",
        description: "d",
        price: 1000,
        currency: "CLP",
        category: { id: 1, documentId: "c1", name: "Oficina", slug: "oficina" },
        dimensions: { width: 49, height: 65, depth: 42 },
        materials: ["Melamina 18 mm"],
      },
      {
        id: 2,
        name: "Silla apilable",
        slug: "silla",
        description: "d",
        price: 1000,
        currency: "CLP",
        category: { id: 2, documentId: "c2", name: "Escolar", slug: "escolar" },
        dimensions: { source: "60cm x 40cm x 40cm" },
        materials: ["Polipropileno"],
      },
      {
        id: 3,
        name: "Sin categoría",
        slug: "sin-categoria",
        description: "d",
        price: 1000,
        currency: "CLP",
        category: null,
      },
    ]);
  });

  it("renders every product grouped by category with Spanish measure rows", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(getAllProducts).toHaveBeenCalled();
    expect(html).toContain("Oficina");
    expect(html).toContain("Escolar");
    expect(html).toContain("Catálogo general");
    expect(html).toContain("Escritorio institucional");
    expect(html).toContain("Silla apilable");
    expect(html).toContain("Sin categoría");
    expect(html).toContain("Medidas: 49 x 65 x 42 cm");
    expect(html).toContain("Medidas: 60 x 40 x 40 cm");
    expect(html).toContain("Melamina 18 mm");
  });

  it("offers the print toolbar and a way back to the catalog", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("Imprimir / Guardar PDF");
    expect(html).toContain('href="/catalogo"');
    // The toolbar must not appear in the printed output.
    expect(html).toContain("no-print");
  });

  it("prints the catalog without the site header/footer via print CSS", async () => {
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("@media print");
    expect(html).toContain("header, footer, nav { display: none !important; }");
  });

  it("renders an empty-state message when the catalog has no products", async () => {
    getAllProducts.mockResolvedValue([]);
    const { default: CatalogoImprimirPage } = await import("./page");
    const html = renderToStaticMarkup(await CatalogoImprimirPage());

    expect(html).toContain("El catálogo aún no tiene productos publicados.");
  });
});
