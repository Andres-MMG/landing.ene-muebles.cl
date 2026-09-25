import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAboutSection: vi.fn(),
  getCategoryCount: vi.fn(),
  getContactCTASection: vi.fn(),
  getProductCount: vi.fn(),
  getSiteSettings: vi.fn(),
}));

vi.mock("@/lib/strapi", () => mocks);
vi.mock("@/components/ContactCTA", () => ({
  ContactCTA: ({ section }: { section?: { title?: string } }) => (
    <div data-testid="contact-cta">{section?.title ?? "Contact CTA"}</div>
  ),
}));

beforeEach(() => {
  mocks.getAboutSection.mockReset();
  mocks.getCategoryCount.mockReset();
  mocks.getContactCTASection.mockReset();
  mocks.getProductCount.mockReset();
  mocks.getSiteSettings.mockReset();

  mocks.getAboutSection.mockResolvedValue({});
  mocks.getCategoryCount.mockResolvedValue(0);
  mocks.getContactCTASection.mockResolvedValue({ title: "Contacto CMS" });
  mocks.getProductCount.mockResolvedValue(0);
  mocks.getSiteSettings.mockResolvedValue({ siteName: "ENE-MUEBLES" });
});

async function renderPage() {
  const { default: NosotrosPage } = await import("./page");
  return renderToStaticMarkup(await NosotrosPage());
}

describe("/nosotros", () => {
  it("preserves current copy fallbacks while displaying honest zero catalog counts", async () => {
    const html = await renderPage();

    expect(html).toContain("Sobre nosotros");
    expect(html).toContain("Un proveedor que entrega lo que promete.");
    expect(html).toContain("Años en el rubro");
    expect(html).toContain(">30<");
    expect(html).toContain("Productos en catálogo");
    expect(html).toContain("Líneas de producto");
    expect(html.match(/>00</g)).toHaveLength(2);
    expect(html).toContain("Regiones: desde la Región de Valparaíso hasta la Región de Los Lagos");
    expect(html).toContain("¿Listo para cotizar tu proyecto institucional?");
    expect(html).toContain(
      "Envíanos tu lista, región y plazos. Te respondemos con ficha técnica y propuesta en 24 h hábiles.",
    );
    expect(html).toContain('href="/contacto"');
    expect(html).toContain("Ir a contacto");
  });

  it("uses CMS page labels and CTA while keeping years and catalog facts derived", async () => {
    const currentYear = new Date().getFullYear();
    mocks.getSiteSettings.mockResolvedValue({
      siteName: "ENE-MUEBLES",
      foundedYear: currentYear - 12,
      dispatchCoverage: "Cobertura configurada",
    });
    mocks.getProductCount.mockResolvedValue(7);
    mocks.getCategoryCount.mockResolvedValue(3);
    mocks.getAboutSection.mockResolvedValue({
      pageEyebrow: "Historia CMS",
      pageTitle: "Título CMS",
      yearsInBusinessLabel: "Trayectoria CMS",
      productCountLabel: "Productos CMS",
      productLineCountLabel: "Familias CMS",
      coverageLabel: "Despacho CMS",
      projectCtaTitle: "Proyecto CMS",
      projectCtaBody: "Cuerpo CMS",
      projectCtaLabel: "Contacto CMS",
    });

    const html = await renderPage();

    expect(html).toContain("Historia CMS");
    expect(html).toContain("Título CMS");
    expect(html).toContain("Trayectoria CMS");
    expect(html).toContain(">12<");
    expect(html).toContain("Productos CMS");
    expect(html).toContain(">07<");
    expect(html).toContain("Familias CMS");
    expect(html).toContain(">03<");
    expect(html).toContain("Despacho CMS");
    expect(html).toContain("Cobertura configurada");
    expect(html).toContain("Proyecto CMS");
    expect(html).toContain("Cuerpo CMS");
    expect(html).toContain('href="/contacto"');
    expect(html).toContain(">Contacto CMS<");
  });

  it("degrades a failed category-count read to an honest zero instead of a hardcoded line count", async () => {
    mocks.getCategoryCount.mockRejectedValueOnce(new Error("cms unavailable"));

    const html = await renderPage();

    expect(html).toContain("Líneas de producto");
    expect(html.match(/>00</g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("calculates founded-year tenure defensively", async () => {
    const { yearsInBusiness } = await import("./page");

    expect(yearsInBusiness(2000, 2026)).toBe(26);
    expect(yearsInBusiness(2030, 2026)).toBe(0);
    expect(yearsInBusiness(undefined, 2026)).toBe(30);
    expect(yearsInBusiness(Number.NaN, 2026)).toBe(30);
  });
});

describe("/nosotros metadata", () => {
  it("uses About-owned SEO fields and the fixed route canonical", async () => {
    mocks.getAboutSection.mockResolvedValue({
      seoTitle: "Nosotros CMS",
      seoDescription: "Descripción nosotros CMS",
    });
    mocks.getSiteSettings.mockResolvedValue({ siteName: "Marca CMS" });
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Nosotros CMS · Marca CMS" });
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/nosotros" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://ene-muebles.cl/nosotros",
      description: "Descripción nosotros CMS",
    });
  });
});
