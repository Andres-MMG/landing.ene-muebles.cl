import { describe, expect, it } from "vitest";
import { isPublicNavigationActive, resolvePublicNavigation } from "./public-navigation";

describe("resolvePublicNavigation", () => {
  it("returns the exact legacy labels, route order, and hrefs by default", () => {
    expect(resolvePublicNavigation()).toEqual({
      labels: {
        home: "Inicio",
        catalog: "Catálogo",
        about: "Nosotros",
        contact: "Contacto",
        headerWhatsapp: "WhatsApp",
        mobileWhatsapp: "Hablar por WhatsApp",
      },
      items: [
        { label: "Inicio", href: "/" },
        { label: "Catálogo", href: "/catalogo" },
        { label: "Nosotros", href: "/nosotros" },
        { label: "Contacto", href: "/contacto" },
      ],
    });
  });

  it("trims valid CMS labels without allowing CMS route or order overrides", () => {
    const resolved = resolvePublicNavigation({
      navigationHomeLabel: "  Portada  ",
      navigationCatalogLabel: "  Productos  ",
      navigationAboutLabel: "  La empresa  ",
      navigationContactLabel: "  Escríbenos  ",
      headerWhatsappLabel: "  Cotizar  ",
      mobileWhatsappLabel: "  Cotizar por WhatsApp  ",
      href: "https://malicioso.example",
      items: [{ label: "Alterado", href: "/alterado" }],
    });

    expect(resolved.labels).toEqual({
      home: "Portada",
      catalog: "Productos",
      about: "La empresa",
      contact: "Escríbenos",
      headerWhatsapp: "Cotizar",
      mobileWhatsapp: "Cotizar por WhatsApp",
    });
    expect(resolved.items).toEqual([
      { label: "Portada", href: "/" },
      { label: "Productos", href: "/catalogo" },
      { label: "La empresa", href: "/nosotros" },
      { label: "Escríbenos", href: "/contacto" },
    ]);
  });

  it("accepts each label at its responsive limit, including the independent mobile bound", () => {
    const desktopLabel = "D".repeat(24);
    const mobileLabel = "M".repeat(80);

    const resolved = resolvePublicNavigation({
      navigationHomeLabel: desktopLabel,
      navigationCatalogLabel: desktopLabel,
      navigationAboutLabel: desktopLabel,
      navigationContactLabel: desktopLabel,
      headerWhatsappLabel: desktopLabel,
      mobileWhatsappLabel: mobileLabel,
    });

    expect(resolved.items.map((item) => item.label)).toEqual(Array(4).fill(desktopLabel));
    expect(resolved.labels.headerWhatsapp).toBe(desktopLabel);
    expect(resolved.labels.mobileWhatsapp).toBe(mobileLabel);
  });

  it("falls back field by field for blank, null, malformed, and over-limit values", () => {
    const resolved = resolvePublicNavigation({
      navigationHomeLabel: "   ",
      navigationCatalogLabel: null,
      navigationAboutLabel: 42,
      navigationContactLabel: "C".repeat(25),
      headerWhatsappLabel: "H".repeat(25),
      mobileWhatsappLabel: "M".repeat(81),
    });

    expect(resolved.labels).toEqual({
      home: "Inicio",
      catalog: "Catálogo",
      about: "Nosotros",
      contact: "Contacto",
      headerWhatsapp: "WhatsApp",
      mobileWhatsapp: "Hablar por WhatsApp",
    });
  });
});

describe("isPublicNavigationActive", () => {
  it.each([
    ["/", "/", true],
    ["/catalogo", "/catalogo", true],
    ["/catalogo/imprimir", "/catalogo", true],
    ["/categoria/sillas", "/catalogo", true],
    ["/producto/mesa", "/catalogo", true],
    ["/nosotros", "/nosotros", true],
    ["/nosotros/equipo", "/nosotros", true],
    ["/contacto", "/contacto", true],
    ["/contacto/gracias", "/contacto", true],
    ["/otra", "/", false],
    ["/nosotros", "/catalogo", false],
  ])("maps %s against %s to %s", (pathname: string, href: string, expected: boolean) => {
    expect(isPublicNavigationActive(pathname, href)).toBe(expected);
  });
});
