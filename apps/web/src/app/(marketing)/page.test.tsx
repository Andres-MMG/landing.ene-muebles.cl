import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAboutSection: vi.fn(),
  getCategories: vi.fn(),
  getCategoryCount: vi.fn(),
  getContactCTASection: vi.fn(),
  getHeroSection: vi.fn(),
  getHomePage: vi.fn(),
  getProducts: vi.fn(),
  getSiteSettings: vi.fn(),
  sectionFallbacks: {
    hero: vi.fn(),
  },
}));

vi.mock("@/lib/strapi", () => mocks);
vi.mock("@/components/Hero", () => ({
  Hero: () => <div data-testid="hero" />,
}));
vi.mock("@/components/CategoryGrid", () => ({
  CategoryGrid: ({ categories }: { categories: Array<{ slug: string }> }) => (
    <div data-categories={categories.map((category) => category.slug).join(",")} />
  ),
}));
vi.mock("@/components/AboutSection", () => ({
  AboutSection: ({
    categoryCount,
    productCount,
  }: {
    categoryCount?: number;
    productCount?: number;
  }) => <div data-category-count={categoryCount} data-product-count={productCount} />,
}));
vi.mock("@/components/FeaturedProducts", () => ({
  FeaturedProducts: ({
    actionCopy,
  }: {
    actionCopy?: {
      detailLabel?: string;
      whatsappLabel?: string;
      whatsappMessageTemplate?: string;
    };
  }) => (
    <div
      data-testid="featured-products"
      data-detail-label={actionCopy?.detailLabel}
      data-whatsapp-label={actionCopy?.whatsappLabel}
      data-whatsapp-template={actionCopy?.whatsappMessageTemplate}
    />
  ),
}));
vi.mock("@/components/ContactCTA", () => ({
  ContactCTA: () => <div data-testid="contact-cta" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSiteSettings.mockResolvedValue({ siteName: "ENE-MUEBLES", socialLinks: {} });
  mocks.getAboutSection.mockResolvedValue({});
  mocks.getHeroSection.mockResolvedValue({});
  mocks.getHomePage.mockResolvedValue({});
  mocks.getContactCTASection.mockResolvedValue({});
  mocks.getCategories.mockResolvedValue([
    { id: 1, slug: "sillas" },
    { id: 2, slug: "mesas" },
  ]);
  mocks.getCategoryCount.mockResolvedValue(42);
  mocks.getProducts.mockResolvedValue({ products: [], total: 7 });
  mocks.sectionFallbacks.hero.mockReturnValue({ title: "Mobiliario institucional" });
});

async function renderPage() {
  const { default: MarketingPage } = await import("./page");
  return renderToStaticMarkup(await MarketingPage());
}

describe("homepage catalog facts", () => {
  it("propagates Site Setting product action copy to featured product cards", async () => {
    mocks.getSiteSettings.mockResolvedValue({
      siteName: "ENE-MUEBLES",
      socialLinks: {},
      productCardDetailLabel: "Ficha CMS",
      productCardWhatsappLabel: "Cotizar CMS",
      whatsappProductMessageTemplate: "Necesito {productName}.",
    });

    const html = await renderPage();

    expect(html).toContain('data-detail-label="Ficha CMS"');
    expect(html).toContain('data-whatsapp-label="Cotizar CMS"');
    expect(html).toContain('data-whatsapp-template="Necesito {productName}."');
  });
  it("uses the pagination-backed category count while keeping real grid categories", async () => {
    const html = await renderPage();

    expect(html).toContain('data-categories="sillas,mesas"');
    expect(html).toContain('data-category-count="42"');
    expect(html).toContain('data-product-count="7"');
    expect(mocks.getCategories).toHaveBeenCalledTimes(1);
    expect(mocks.getCategoryCount).toHaveBeenCalledTimes(1);
  });
});

describe("homepage SEO metadata", () => {
  it("resolves Home then global SEO per field and owns the root canonical", async () => {
    mocks.getHomePage.mockResolvedValue({ seoTitle: "Portada CMS", seoDescription: " " });
    mocks.getSiteSettings.mockResolvedValue({
      siteName: "Marca CMS",
      seoDescription: "Descripción global CMS",
      seoShareImageAlt: "Alt CMS",
    });
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Portada CMS" });
    expect(metadata.applicationName).toBe("Marca CMS");
    expect(metadata.description).toBe("Descripción global CMS");
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://ene-muebles.cl",
      siteName: "Marca CMS",
      title: "Portada CMS",
      description: "Descripción global CMS",
      images: [{ alt: "Alt CMS" }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Portada CMS",
      description: "Descripción global CMS",
    });
  });

  it("uses distinct exact meta and historical social fallbacks only when SEO descriptions are absent", async () => {
    mocks.getHomePage.mockResolvedValue({});
    mocks.getSiteSettings.mockResolvedValue({ siteName: "Marca CMS", socialLinks: {} });
    const { generateMetadata } = await import("./page");

    const metadata = await generateMetadata();

    expect(metadata.applicationName).toBe("Marca CMS");
    expect(metadata.description).toBe(
      "Mobiliario escolar y de oficina certificado para instituciones en Chile. Catálogo, despacho desde la Región de Valparaíso hasta la Región de Los Lagos y cotización en 24 h.",
    );
    expect(metadata.openGraph?.description).toBe(
      "Mobiliario institucional para aulas, oficinas e instituciones en Chile. Catálogo 2026, despacho desde la Región de Valparaíso hasta la Región de Los Lagos y cotización en 24 h hábiles.",
    );
    expect(metadata.twitter?.description).toBe(metadata.openGraph?.description);
  });
});
