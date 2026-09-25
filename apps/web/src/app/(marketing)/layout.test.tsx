import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePublicNavigation } from "@/lib/public-navigation";

const getSiteSettings = vi.fn();
const getFooterBlock = vi.fn();
const captured = vi.hoisted(() => ({
  headerProps: [] as Array<Record<string, unknown>>,
  footerProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/strapi", () => ({
  getSiteSettings,
  getFooterBlock,
}));

vi.mock("@/components/Header", () => ({
  Header: (props: Record<string, unknown>) => {
    captured.headerProps.push(props);
    return <header data-testid="header">Header</header>;
  },
}));

vi.mock("@/components/Footer", () => ({
  Footer: (props: Record<string, unknown>) => {
    captured.footerProps.push(props);
    return <footer data-testid="footer">Footer</footer>;
  },
}));

describe("(marketing)/layout — resilient shared chrome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.headerProps.length = 0;
    captured.footerProps.length = 0;
    getSiteSettings.mockResolvedValue({ siteName: "ENE-MUEBLES" });
    getFooterBlock.mockResolvedValue({});
  });

  const renderLayout = async (): Promise<string> => {
    const { default: MarketingLayout } = await import("./layout");
    return renderToStaticMarkup(await MarketingLayout({ children: <p>Contenido de prueba</p> }));
  };

  it("renders exactly one main landmark with id=main-content and tabindex=-1", async () => {
    const html = await renderLayout();
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('<main id="main-content"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("</main>");
  });

  it("renders the skip link as the first focusable element before the header", async () => {
    const html = await renderLayout();
    const skipLink = html.indexOf('href="#main-content"');
    const header = html.indexOf('data-testid="header"');
    expect(skipLink).toBeGreaterThan(-1);
    expect(header).toBeGreaterThan(-1);
    expect(skipLink).toBeLessThan(header);
    expect(html).toContain("Saltar al contenido");
  });

  it("keeps the footer outside main and after the content", async () => {
    const html = await renderLayout();
    const mainEnd = html.indexOf("</main>");
    const footer = html.indexOf('data-testid="footer"');
    expect(mainEnd).toBeGreaterThan(-1);
    expect(footer).toBeGreaterThan(mainEnd);
  });

  it("passes CMS navigation/action labels while preserving fixed routes and order", async () => {
    getSiteSettings.mockResolvedValueOnce({
      siteName: "Marca CMS",
      navigationHomeLabel: "Portada",
      navigationCatalogLabel: "Productos",
      navigationAboutLabel: "La empresa",
      navigationContactLabel: "Escríbenos",
      headerWhatsappLabel: "Cotizar",
      mobileWhatsappLabel: "Cotizar por WhatsApp",
    });

    await renderLayout();

    const headerProps = captured.headerProps.at(-1);
    expect(headerProps).toMatchObject({
      siteName: "Marca CMS",
      navigationHomeLabel: "Portada",
      navigationCatalogLabel: "Productos",
      navigationAboutLabel: "La empresa",
      navigationContactLabel: "Escríbenos",
      headerWhatsappLabel: "Cotizar",
      mobileWhatsappLabel: "Cotizar por WhatsApp",
    });
    expect(resolvePublicNavigation(headerProps).items).toEqual([
      { label: "Portada", href: "/" },
      { label: "Productos", href: "/catalogo" },
      { label: "La empresa", href: "/nosotros" },
      { label: "Escríbenos", href: "/contacto" },
    ]);
  });

  it("renders Header and Footer with a minimal fallback when Site Setting fails", async () => {
    getSiteSettings.mockRejectedValueOnce(new Error("CMS settings unavailable"));

    const html = await renderLayout();

    expect(html).toContain('data-testid="header"');
    expect(html).toContain('data-testid="footer"');
    expect(captured.headerProps.at(-1)).toMatchObject({ siteName: "ENE-MUEBLES" });
    expect(captured.footerProps.at(-1)).toMatchObject({
      settings: { siteName: "ENE-MUEBLES" },
    });
  });

  it("keeps both chrome regions when the optional Footer Block read fails", async () => {
    getFooterBlock.mockRejectedValueOnce(new Error("CMS footer unavailable"));

    const html = await renderLayout();

    expect(html).toContain('data-testid="header"');
    expect(html).toContain('data-testid="footer"');
    expect(captured.footerProps.at(-1)).toMatchObject({
      settings: { siteName: "ENE-MUEBLES" },
      block: undefined,
    });
  });
});
