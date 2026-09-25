import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Header", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("renders the exact legacy public navigation and technical accessibility labels", () => {
    const html = renderToStaticMarkup(<Header siteName="ENE-MUEBLES" />);

    expect(html).toContain("Inicio");
    expect(html).toContain("Catálogo");
    expect(html).toContain("Nosotros");
    expect(html).toContain("Contacto");
    expect(html).toContain('aria-label="Navegación principal"');
    expect(html).toContain('aria-label="Abrir menú"');
    expect(html).toContain('aria-controls="mobile-menu"');
  });

  it("renders trimmed CMS navigation and desktop WhatsApp labels", () => {
    const html = renderToStaticMarkup(
      <Header
        siteName="ENE-MUEBLES"
        whatsappNumber="+56 9 9539 5339"
        navigationHomeLabel="  Portada  "
        navigationCatalogLabel="  Productos  "
        navigationAboutLabel="  La empresa  "
        navigationContactLabel="  Escríbenos  "
        headerWhatsappLabel="  Cotizar  "
        mobileWhatsappLabel="  Cotizar por WhatsApp  "
      />,
    );

    expect(html).toContain("Portada");
    expect(html).toContain("Productos");
    expect(html).toContain("La empresa");
    expect(html).toContain("Escríbenos");
    expect(html).toContain("Cotizar");
    expect(html).toContain('aria-label="Portada"');
    expect(html).toContain('aria-label="Cotizar"');
    expect(html).toContain('class="min-w-0 truncate whitespace-nowrap"');
    expect(html).toContain("max-w-28");
    expect(html).toContain("max-w-48");
    expect(html).not.toContain(">Inicio<");
    expect(html).not.toContain(">Catálogo<");
  });

  it("keeps the catalog navigation item active on product routes", () => {
    navigation.pathname = "/producto/mesa-escolar";

    const html = renderToStaticMarkup(<Header siteName="ENE-MUEBLES" />);

    expect(html).toMatch(/href="\/catalogo"[^>]*aria-current="page"/);
    expect(html).not.toMatch(/href="\/nosotros"[^>]*aria-current="page"/);
  });
});
