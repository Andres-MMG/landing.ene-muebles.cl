import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * (marketing) layout — semantic main landmark + skip link (B2/U13,
 * accessibility spec "Semantic Structure and Navigation").
 *
 * Header/Footer and the Strapi reads are mocked; the assertions target
 * the chrome the layout itself renders: a single `main#main-content`
 * landmark and the skip link as the FIRST focusable element.
 */

const getSiteSettings = vi.fn();
const getFooterBlock = vi.fn();

vi.mock("@/lib/strapi", () => ({
  getSiteSettings,
  getFooterBlock,
}));

vi.mock("@/components/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

describe("(marketing)/layout — landmark + skip link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSiteSettings.mockResolvedValue({ siteName: "ENE-MUEBLES" });
    getFooterBlock.mockResolvedValue(null);
  });

  const renderLayout = async (): Promise<string> => {
    const { default: MarketingLayout } = await import("./layout");
    return renderToStaticMarkup(
      await MarketingLayout({ children: <p>Contenido de prueba</p> })
    );
  };

  it("renders exactly one main landmark with id=main-content and tabindex=-1", async () => {
    const html = await renderLayout();
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('<main id="main-content"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("</main>");
  });

  it("renders the skip link as the first focusable element (before the header)", async () => {
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
});
