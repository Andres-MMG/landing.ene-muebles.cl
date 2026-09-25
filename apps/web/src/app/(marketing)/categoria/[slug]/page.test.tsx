import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("categoria/[slug] — Contact CTA", () => {
  it("renders copy from the Contact CTA singleton", async () => {
    const getContactCTASection = vi.fn().mockResolvedValue({
      title: "Category page CMS CTA",
      body: "Category page CMS body",
      buttonLabel: "Request category quote",
      buttonHref: "/contacto",
    });
    vi.doMock("@/lib/strapi", () => ({
      getCategories: vi
        .fn()
        .mockResolvedValue([
          { id: 1, name: "Office", slug: "office", description: "Office furniture" },
        ]),
      getProducts: vi.fn().mockResolvedValue({ products: [], total: 0 }),
      getSiteSettings: vi.fn().mockResolvedValue({ contactEmail: "hello@example.com" }),
      getContactCTASection,
    }));
    vi.doMock("@/components/CatalogSearch", () => ({ CatalogSearch: () => null }));
    vi.doMock("@/components/CategoryFilter", () => ({ CategoryFilter: () => null }));

    const { default: CategoryPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CategoryPage({
        params: Promise.resolve({ slug: "office" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(getContactCTASection).toHaveBeenCalledOnce();
    expect(html).toContain("Category page CMS CTA");
    expect(html).toContain("Category page CMS body");
    expect(html).toContain('href="/contacto"');
    expect(html).toContain("Request category quote");
  });

  it("propagates Site Setting product action copy to category cards", async () => {
    vi.doMock("@/lib/strapi", () => ({
      getCategories: vi
        .fn()
        .mockResolvedValue([
          { id: 1, name: "Office", slug: "office", description: "Office furniture" },
        ]),
      getProducts: vi.fn().mockResolvedValue({
        products: [
          {
            id: 8,
            name: "Mesa ejecutiva 100%",
            slug: "mesa-ejecutiva",
            description: "Mesa de prueba.",
            price: 0,
            currency: "CLP",
          },
        ],
        total: 1,
      }),
      getSiteSettings: vi.fn().mockResolvedValue({
        whatsappNumber: "+56912345678",
        productCardDetailLabel: "Ficha categoría CMS",
        productCardWhatsappLabel: "Cotizar categoría CMS",
        whatsappProductMessageTemplate: "Categoría: {productName}.",
      }),
      getContactCTASection: vi.fn().mockResolvedValue({}),
    }));
    vi.doMock("@/components/CatalogSearch", () => ({ CatalogSearch: () => null }));
    vi.doMock("@/components/CategoryFilter", () => ({ CategoryFilter: () => null }));

    const { default: CategoryPage } = await import("./page");
    const html = renderToStaticMarkup(
      await CategoryPage({
        params: Promise.resolve({ slug: "office" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Ficha categoría CMS");
    expect(html).toContain("Cotizar categoría CMS");
    expect(html).toContain(
      'href="https://wa.me/56912345678?text=Categor%C3%ADa%3A%20Mesa%20ejecutiva%20100%25."',
    );
  });
});

describe("categoria/[slug] metadata", () => {
  it("uses the published entity canonical and omits it when the entity is missing", async () => {
    const getCategories = vi
      .fn()
      .mockResolvedValue([
        { id: 1, name: "Office", slug: "office", description: "Office furniture" },
      ]);
    vi.doMock("@/lib/strapi", () => ({
      getCategories,
      getProducts: vi.fn(),
      getSiteSettings: vi.fn().mockResolvedValue({ siteName: "Marca CMS" }),
      getContactCTASection: vi.fn(),
    }));
    const { generateMetadata } = await import("./page");
    const found = await generateMetadata({
      params: Promise.resolve({ slug: "office" }),
      searchParams: Promise.resolve({}),
    });
    expect(found.alternates).toEqual({ canonical: "https://ene-muebles.cl/categoria/office" });
    expect(found.title).toEqual({ absolute: "Office · Marca CMS" });

    getCategories.mockResolvedValueOnce([]);
    const missing = await generateMetadata({
      params: Promise.resolve({ slug: "invented" }),
      searchParams: Promise.resolve({}),
    });
    expect(missing.alternates).toEqual({ canonical: null });
    expect(missing.openGraph).not.toHaveProperty("url");
  });
});
