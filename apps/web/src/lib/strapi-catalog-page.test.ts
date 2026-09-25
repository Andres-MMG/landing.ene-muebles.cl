import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const cmsCatalogPage = {
  id: 2,
  documentId: "catalog-page-doc",
  eyebrow: "Catálogo CMS",
  productCountSuffix: "productos CMS.",
  documentationText: "Documentación CMS.",
  printCtaLabel: "Imprimir catálogo",
  printCoverTitle: "Portada CMS",
  printCoverBody: "Cuerpo CMS.",
  printIndexTitle: "Índice CMS",
  printCategorySubtitle: "Subtítulo CMS",
  printPublishedProductsSuffix: "productos publicados CMS",
};

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_API_TOKEN: "public-token",
  };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

function mockJson(body: unknown, status = 200) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("getCatalogPage", () => {
  it("returns the exact current copy when the singleton is absent", async () => {
    mockJson({ data: null });
    const { getCatalogPage } = await import("./strapi");

    await expect(getCatalogPage()).resolves.toEqual({
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
  });

  it("normalizes the complete CMS record and uses the catalog-page cache tag", async () => {
    mockJson({ data: cmsCatalogPage });
    const { getCatalogPage, STRAPI_CACHE_TAGS } = await import("./strapi");

    await expect(getCatalogPage()).resolves.toEqual(cmsCatalogPage);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/catalog-page"),
      expect.objectContaining({
        next: expect.objectContaining({ tags: [STRAPI_CACHE_TAGS.catalogPage] }),
      }),
    );
  });

  it("falls back atomically when a required field is missing", async () => {
    mockJson({ data: { ...cmsCatalogPage, printIndexTitle: undefined } });
    const { getCatalogPage } = await import("./strapi");

    await expect(getCatalogPage()).resolves.toEqual(
      expect.objectContaining({
        eyebrow: "Catálogo institucional",
        printIndexTitle: "Líneas de producto",
      }),
    );
  });
});
