import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { site as siteTokens } from "@ene/ui-tokens";
import type { FooterBlock, SiteSetting } from "@/lib/strapi";
import { Footer } from "./Footer";

const mocks = vi.hoisted(() => ({
  getProductCount: vi.fn(),
}));

vi.mock("@/lib/strapi", () => ({
  getProductCount: mocks.getProductCount,
  getPublicRut: (value?: string) => value?.trim() || undefined,
}));

async function renderFooter(settings: SiteSetting, block?: FooterBlock): Promise<string> {
  return renderToStaticMarkup(await Footer({ settings, block }));
}

describe("Footer", () => {
  beforeEach(() => {
    mocks.getProductCount.mockReset();
  });

  it("renders exact fallbacks, fixed routes, derived year, and zero-count supporting copy", async () => {
    mocks.getProductCount.mockResolvedValue(0);

    const html = await renderFooter({ siteName: "ENE-MUEBLES" });
    const year = new Date().getFullYear();

    expect(html).toContain(siteTokens.footerCopy);
    expect(html).toContain("Catálogo");
    expect(html).toContain("Contacto");
    expect(html).toContain("Legal");
    expect(html).toContain("Ver catálogo");
    expect(html).toContain("Línea oficina");
    expect(html).toContain("Línea escolar");
    expect(html).toContain("Sobre nosotros");
    expect(html).toContain("Términos y condiciones");
    expect(html).toContain("Política de privacidad");
    expect(html).toContain(`© ${year} ENE-MUEBLES`);
    expect(html).toContain(`Catálogo institucional · ${year}`);
    expect(html).toContain("Respaldo escrito · Garantía 1 año");
    expect(html).toMatch(/href="\/"[^>]*>Inicio<\/a>/);
    expect(html).toMatch(/href="\/catalogo"[^>]*>Catálogo<\/a>/);
    expect(html).toMatch(/href="\/nosotros"[^>]*>Nosotros<\/a>/);
    expect(html).toMatch(/href="\/contacto"[^>]*>Contacto<\/a>/);
    expect(html).toMatch(/href="\/categoria\/oficina"/);
    expect(html).toMatch(/href="\/categoria\/escolar"/);
    expect(html).toMatch(/href="\/terminos"/);
    expect(html).toMatch(/href="\/privacidad"/);
  });

  it("renders CMS footer copy, global navigation labels, derived count, and Site Setting facts", async () => {
    mocks.getProductCount.mockResolvedValue(23);
    const year = new Date().getFullYear();
    const settings = {
      siteName: "Marca CMS",
      tagline: "Tagline de marca",
      contactEmail: "ventas@example.cl",
      contactPhone: "+56 2 2345 6789",
      whatsappNumber: "+56 9 1111 2222",
      address: "Calle CMS 123",
      addressCity: "Temuco",
      dispatchCoverage: "Despacho CMS",
      warrantyText: "Garantía extendida CMS",
      rut: "76.123.456-7",
      navigationHomeLabel: "Portada global",
      navigationCatalogLabel: "Productos global",
      navigationAboutLabel: "Empresa global",
      navigationContactLabel: "Ayuda global",
      socialLinks: { facebook: "https://facebook.com/marca-cms" },
    } as unknown as SiteSetting;
    const block = {
      copyrightText: "© Texto CMS",
      tagline: "No debe mostrarse con conteo positivo",
      legalSnippet: "Legal CMS",
      productCountSuffix: "unidades certificadas CMS",
      catalogHeading: "Productos del pie",
      contactHeading: "Canales CMS",
      legalHeading: "Normativa CMS",
      socialHeading: "Comunidad CMS",
      catalogCtaLabel: "Abrir catálogo CMS",
      officeLineLabel: "Oficina CMS",
      schoolLineLabel: "Escolar CMS",
      aboutLinkLabel: "Empresa CMS",
      termsLinkLabel: "Condiciones CMS",
      privacyLinkLabel: "Privacidad CMS",
      rutLabel: "Identificación",
      catalogStampLabel: "Sello CMS",
      writtenBackingLabel: "Respaldado CMS",
    } as unknown as FooterBlock;

    const html = await renderFooter(settings, block);

    expect(html).toContain("23 unidades certificadas CMS");
    expect(html).not.toContain("No debe mostrarse con conteo positivo");
    expect(html).toContain("Productos del pie");
    expect(html).toContain("Canales CMS");
    expect(html).toContain("Normativa CMS");
    expect(html).toContain("Comunidad CMS");
    expect(html).toContain("Abrir catálogo CMS");
    expect(html).toContain("Oficina CMS");
    expect(html).toContain("Escolar CMS");
    expect(html).toContain("Empresa CMS");
    expect(html).toContain("Condiciones CMS");
    expect(html).toContain("Privacidad CMS");
    expect(html).toContain("Portada global");
    expect(html).toContain("Productos global");
    expect(html).toContain("Empresa global");
    expect(html).toContain("Ayuda global");
    expect(html).toContain("Marca CMS");
    expect(html).toContain("ventas@example.cl");
    expect(html).toContain("+56 2 2345 6789");
    expect(html).toContain("+56 9 1111 2222");
    expect(html).toContain("Calle CMS 123, Temuco");
    expect(html).toContain("Despacho CMS");
    expect(html).toContain("Identificación 76.123.456-7");
    expect(html).toContain("© Texto CMS");
    expect(html).toContain("Legal CMS");
    expect(html).toContain(`Sello CMS · ${year}`);
    expect(html).toContain("Respaldado CMS · Garantía extendida CMS");
    expect(html).toContain('aria-label="Abrir facebook de Marca CMS"');
    expect(html).toContain('href="https://facebook.com/marca-cms"');
  });

  it("falls back field by field when optional CMS strings are blank", async () => {
    mocks.getProductCount.mockResolvedValue(7);

    const html = await renderFooter(
      {
        siteName: "Marca",
        navigationCatalogLabel: "Catálogo global",
        navigationContactLabel: "Contacto global",
      } as unknown as SiteSetting,
      {
        productCountSuffix: "   ",
        catalogHeading: "   ",
        contactHeading: "\n",
        writtenBackingLabel: "\t",
      } as unknown as FooterBlock,
    );

    expect(html).toContain("7 productos certificados para instituciones");
    expect(html).toContain("Catálogo global");
    expect(html).toContain("Contacto global");
    expect(html).toContain("Respaldo escrito · Garantía 1 año");
  });
});
