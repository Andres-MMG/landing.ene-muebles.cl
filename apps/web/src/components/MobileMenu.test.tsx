import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileMenu, type NavItem } from "./MobileMenu";

const items: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
];

const renderMenu = (overrides: Partial<Parameters<typeof MobileMenu>[0]> = {}) =>
  renderToStaticMarkup(
    <MobileMenu
      open
      onClose={() => undefined}
      items={items}
      pathname="/"
      isActive={(pathname, href) => pathname === href}
      triggerRef={createRef<HTMLButtonElement>()}
      {...overrides}
    />,
  );

describe("MobileMenu", () => {
  it("uses the exact public WhatsApp fallback and keeps technical labels code-owned", () => {
    const html = renderMenu({ whatsappHref: "https://wa.me/56995395339" });

    expect(html).toContain("Hablar por WhatsApp");
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Menú"');
    expect(html).toContain('aria-label="Cerrar menú"');
  });

  it("renders a custom public WhatsApp label without changing its target", () => {
    const html = renderMenu({
      whatsappHref: "https://wa.me/56995395339?text=hola",
      whatsappLabel: "Cotizar por WhatsApp",
    });

    expect(html).toContain("Cotizar por WhatsApp");
    expect(html).toContain('href="https://wa.me/56995395339?text=hola"');
    expect(html).not.toContain("Hablar por WhatsApp");
  });

  it("preserves the AdminHeader menu contract when public-only props are omitted", () => {
    const html = renderMenu({
      id: "admin-mobile-menu",
      brand: "ENE-MUEBLES",
      menuLabel: "Navegación del panel",
      footer: <button type="button">Cerrar sesión</button>,
    });

    expect(html).toContain('id="admin-mobile-menu"');
    expect(html).toContain('aria-label="Navegación del panel"');
    expect(html).toContain("ENE-MUEBLES");
    expect(html).toContain("Cerrar sesión");
    expect(html).not.toContain("Hablar por WhatsApp");
  });

  it("retains close-on-link, Escape, focus trap, scroll lock, and focus restoration logic", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile("apps/web/src/components/MobileMenu.tsx", "utf8"),
    );

    expect(source).toContain("onClick={onClose}");
    expect(source).toContain('e.key === "Escape"');
    expect(source).toContain('e.key !== "Tab"');
    expect(source).toContain('document.addEventListener("focusin", containFocus)');
    expect(source).toContain('body.style.overflow = "hidden"');
    expect(source).toContain("menuTrigger.focus()");
  });
});
