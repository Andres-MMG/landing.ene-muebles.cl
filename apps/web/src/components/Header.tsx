"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { MobileMenu } from "./MobileMenu";
import { isPublicNavigationActive, resolvePublicNavigation } from "@/lib/public-navigation";
import { buildWhatsAppHandoff } from "@/lib/whatsapp";

type HeaderProps = {
  siteName: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  contactPhone?: string;
  contactEmail?: string;
  navigationHomeLabel?: string;
  navigationCatalogLabel?: string;
  navigationAboutLabel?: string;
  navigationContactLabel?: string;
  headerWhatsappLabel?: string;
  mobileWhatsappLabel?: string;
};

const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, me gustaría una cotización de su catálogo de mobiliario institucional.";

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
  navigationHomeLabel,
  navigationCatalogLabel,
  navigationAboutLabel,
  navigationContactLabel,
  headerWhatsappLabel,
  mobileWhatsappLabel,
}: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const navigation = resolvePublicNavigation({
    navigationHomeLabel,
    navigationCatalogLabel,
    navigationAboutLabel,
    navigationContactLabel,
    headerWhatsappLabel,
    mobileWhatsappLabel,
  });

  const whatsappHref =
    buildWhatsAppHandoff(
      { whatsappNumber, whatsappDefaultMessage },
      { fallbackMessage: DEFAULT_WHATSAPP_MESSAGE },
    )?.href ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-line bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-6 sm:px-10 lg:h-20 lg:px-16 xl:gap-6">
        <Link
          href="/"
          aria-label={siteName}
          title={siteName}
          className="inline-flex min-w-0 max-w-48 shrink items-center truncate whitespace-nowrap py-2 font-display text-lg font-semibold tracking-tight text-ink transition-colors hover:text-taupe-text lg:py-0 lg:text-xl"
        >
          {siteName}
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden min-w-0 lg:flex lg:flex-1 lg:items-center lg:justify-center lg:gap-4 xl:gap-8"
        >
          {navigation.items.map((item) => {
            const active = isPublicNavigationActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href as never}
                aria-label={item.label}
                title={item.label}
                className={`relative inline-flex min-w-0 max-w-28 items-center py-1 text-sm font-medium tracking-tight transition-colors hover:text-taupe-text xl:max-w-36 ${
                  active ? "text-ink" : "text-ink-mute"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="min-w-0 truncate whitespace-nowrap">{item.label}</span>
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

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={navigation.labels.headerWhatsapp}
              title={navigation.labels.headerWhatsapp}
              className="hidden min-w-0 max-w-48 lg:inline-flex lg:items-center lg:gap-2 lg:border lg:border-ink lg:px-4 lg:py-2 lg:text-xs lg:font-medium lg:uppercase lg:tracking-[0.18em] lg:text-ink lg:transition-colors lg:duration-300 lg:hover:bg-ink lg:hover:text-paper"
            >
              <span className="min-w-0 truncate whitespace-nowrap">
                {navigation.labels.headerWhatsapp}
              </span>
              <span className="shrink-0" aria-hidden>
                →
              </span>
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
        items={navigation.items}
        pathname={pathname}
        isActive={isPublicNavigationActive}
        whatsappHref={whatsappHref}
        whatsappLabel={navigation.labels.mobileWhatsapp}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        triggerRef={menuTriggerRef}
      />
    </header>
  );
}
