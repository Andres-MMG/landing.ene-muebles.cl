"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { MobileMenu } from "./MobileMenu";
import { buildWhatsAppLink } from "@/lib/strapi";

type HeaderProps = {
  siteName: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  contactPhone?: string;
  contactEmail?: string;
};

const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, me gustaría una cotización de su catálogo de mobiliario institucional.";

const navItems: { label: string; href: string }[] = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
];

const isActive = (pathname: string, href: string): boolean => {
  if (href === "/") return pathname === "/";
  if (href === "/catalogo") return pathname.startsWith("/catalogo") || pathname.startsWith("/categoria") || pathname.startsWith("/producto");
  return pathname === href || pathname.startsWith(`${href}/`);
};

/**
 * Header — sticky institutional navigation.
 *
 * Paper bg, hairline border, brand on the left, nav center / CTA on the
 * right. Active state is a thin taupe underline below the link. Mobile
 * collapses the nav into a full-screen menu (MobileMenu).
 */
export function Header({
  siteName,
  whatsappNumber,
  whatsappDefaultMessage,
  contactPhone,
  contactEmail,
}: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const message = whatsappDefaultMessage?.trim() || DEFAULT_WHATSAPP_MESSAGE;
  const whatsappHref = whatsappNumber
    ? buildWhatsAppLink(whatsappNumber, message)
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-line bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-6 px-6 sm:px-10 lg:h-20 lg:px-16">
        <Link
          href="/"
          className="inline-flex items-center py-2 font-display text-lg font-semibold tracking-tight text-ink transition-colors hover:text-taupe-deep lg:py-0 lg:text-xl"
        >
          {siteName}
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:gap-10"
        >
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={`relative inline-flex items-center py-1 text-sm font-medium tracking-tight transition-colors hover:text-taupe-deep ${
                  active ? "text-ink" : "text-ink-mute"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 -bottom-1 h-px transition-colors ${
                    active ? "bg-taupe-deep" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex lg:items-center lg:gap-2 lg:border lg:border-ink lg:px-4 lg:py-2 lg:text-xs lg:font-medium lg:uppercase lg:tracking-[0.18em] lg:text-ink lg:transition-colors lg:duration-300 lg:hover:bg-ink lg:hover:text-paper"
            >
              WhatsApp
              <span aria-hidden>→</span>
            </a>
          ) : null}

          <button
            type="button"
            ref={menuTriggerRef}
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="inline-flex h-11 w-11 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink lg:hidden"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <line x1="0" y1="3" x2="14" y2="3" />
              <line x1="0" y1="7" x2="14" y2="7" />
              <line x1="0" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={navItems}
        pathname={pathname}
        isActive={isActive}
        whatsappHref={whatsappHref}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        triggerRef={menuTriggerRef}
      />
    </header>
  );
}
