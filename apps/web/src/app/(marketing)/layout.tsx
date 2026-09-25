import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getFooterBlock, getSiteSettings, type SiteSetting } from "@/lib/strapi";

const FALLBACK_SITE_SETTINGS: SiteSetting = {
  siteName: "ENE-MUEBLES",
};

/**
 * Marketing layout: wraps every page in the (marketing) route group
 * with the public site chrome (Header + Footer). Pages under /admin/*
 * intentionally live outside this group so they only render their own
 * admin chrome (see app/admin/(authenticated)/layout.tsx).
 */
export default async function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [settings, footerBlock] = await Promise.all([
    getSiteSettings().catch((err) => {
      console.warn("[marketing/layout] site-setting fetch failed:", err);
      return FALLBACK_SITE_SETTINGS;
    }),
    getFooterBlock().catch((err) => {
      console.warn("[marketing/layout] footer-block fetch failed:", err);
      return undefined;
    }),
  ]);

  return (
    <>
      {/* B2/U13 — skip link (WCAG 2.4.1): first focusable element on
          every marketing page. Visually hidden until :focus-visible
          (see `.skip-link` in globals.css); the native hash jump to
          #main-content moves focus because main carries tabIndex={-1}. */}
      <a href="#main-content" className="skip-link t-label">
        Saltar al contenido
      </a>
      <Header
        siteName={settings.siteName}
        whatsappNumber={settings.whatsappNumber}
        whatsappDefaultMessage={settings.whatsappDefaultMessage}
        contactPhone={settings.contactPhone}
        contactEmail={settings.contactEmail}
        navigationHomeLabel={settings.navigationHomeLabel}
        navigationCatalogLabel={settings.navigationCatalogLabel}
        navigationAboutLabel={settings.navigationAboutLabel}
        navigationContactLabel={settings.navigationContactLabel}
        headerWhatsappLabel={settings.headerWhatsappLabel}
        mobileWhatsappLabel={settings.mobileWhatsappLabel}
      />
      {/* B2/U13 — the single `main` landmark for the marketing group.
          tabIndex={-1} makes it the fragment-navigation focus target;
          the focus ring is suppressed and scroll-margin-top clears the
          sticky header (globals.css). Pages inside this group must NOT
          render their own <main>. */}
      <main id="main-content" tabIndex={-1} className="bg-paper text-ink">
        {children}
      </main>
      <Footer settings={settings} block={footerBlock} />
    </>
  );
}
